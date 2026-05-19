<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Models\AuditLog;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$user = AuthMiddleware::requireAuth();
$db = Database::getInstance()->getConnection();
$auditLog = new AuditLog();
$method = $_SERVER['REQUEST_METHOD'];
$userId = (int)$user['id'];

switch ($method) {
    case 'GET':
        $otherId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
        $since = isset($_GET['since']) ? trim($_GET['since']) : null;

        if ($otherId) {
            $stmt = $db->prepare(
                "SELECT dm.*, u.display_name as sender_name
                 FROM direct_messages dm
                 JOIN users u ON dm.sender_id = u.id
                 WHERE (dm.sender_id = :uid1 AND dm.recipient_id = :oid1)
                    OR (dm.sender_id = :oid2 AND dm.recipient_id = :uid2)
                 ORDER BY dm.created_at ASC"
            );
            $stmt->execute([':uid1' => $userId, ':oid1' => $otherId, ':oid2' => $otherId, ':uid2' => $userId]);
            $messages = $stmt->fetchAll();

            $stmt = $db->prepare(
                "UPDATE direct_messages SET is_read = 1
                 WHERE sender_id = :oid AND recipient_id = :uid AND is_read = 0"
            );
            $stmt->execute([':oid' => $otherId, ':uid' => $userId]);

            echo json_encode(['messages' => $messages, 'other_id' => $otherId]);
        } else {
            $stmt = $db->prepare(
                "SELECT DISTINCT
                    CASE WHEN sender_id = :uid THEN recipient_id ELSE sender_id END AS other_id,
                    u.display_name AS other_name,
                    u.role AS other_role,
                    (SELECT content FROM direct_messages
                     WHERE (sender_id = :uid2 AND recipient_id = other_id)
                        OR (sender_id = other_id AND recipient_id = :uid3)
                     ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT created_at FROM direct_messages
                     WHERE (sender_id = :uid4 AND recipient_id = other_id)
                        OR (sender_id = other_id AND recipient_id = :uid5)
                     ORDER BY created_at DESC LIMIT 1) AS last_time,
                    (SELECT COUNT(*) FROM direct_messages
                     WHERE sender_id = other_id AND recipient_id = :uid6 AND is_read = 0) AS unread
                 FROM direct_messages
                 JOIN users u ON u.id = CASE WHEN sender_id = :uid7 THEN recipient_id ELSE sender_id END
                 WHERE sender_id = :uid8 OR recipient_id = :uid9
                 ORDER BY last_time DESC"
            );
            $stmt->execute([
                ':uid' => $userId, ':uid2' => $userId, ':uid3' => $userId,
                ':uid4' => $userId, ':uid5' => $userId, ':uid6' => $userId,
                ':uid7' => $userId, ':uid8' => $userId, ':uid9' => $userId
            ]);
            $conversations = $stmt->fetchAll();

            $roleFilter = ($user['role'] === 'victim') ? " AND role != 'victim'" : '';
            $stmt = $db->prepare(
                "SELECT id, display_name, role FROM users WHERE id != :uid{$roleFilter} ORDER BY display_name ASC"
            );
            $stmt->execute([':uid' => $userId]);
            $allUsers = $stmt->fetchAll();

            echo json_encode(['conversations' => $conversations, 'all_users' => $allUsers]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $recipientId = isset($input['recipient_id']) ? (int)$input['recipient_id'] : null;
        $content = trim($input['content'] ?? '');

        if (!$recipientId || !$content) {
            http_response_code(400); echo json_encode(['error' => 'recipient_id and content are required']); exit;
        }

        $stmt = $db->prepare("SELECT id, role FROM users WHERE id = :id");
        $stmt->execute([':id' => $recipientId]);
        $recipient = $stmt->fetch();
        if (!$recipient) {
            http_response_code(404); echo json_encode(['error' => 'Recipient not found']); exit;
        }

        if ($user['role'] === 'victim' && $recipient['role'] === 'victim') {
            http_response_code(403); echo json_encode(['error' => 'Victims can only message responders, operators, or admins']); exit;
        }

        $stmt = $db->prepare(
            "INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES (:sid, :rid, :content)"
        );
        $stmt->execute([':sid' => $userId, ':rid' => $recipientId, ':content' => $content]);
        $msgId = (int)$db->lastInsertId();

        $stmt = $db->prepare(
            "SELECT dm.*, u.display_name as sender_name
             FROM direct_messages dm
             JOIN users u ON dm.sender_id = u.id
             WHERE dm.id = :id"
        );
        $stmt->execute([':id' => $msgId]);
        $message = $stmt->fetch();

        $auditLog->logAction($userId, 'dm_sent', "Direct message to user #$recipientId");

        http_response_code(201);
        echo json_encode(['message' => $message]);
        break;
}
