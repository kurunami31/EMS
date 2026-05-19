<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DirectMessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        DB::statement("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");

        $user = $request->user();
        $userId = $user->id;

        $otherId = $request->query('user_id');

        if ($otherId) {
            $messages = DirectMessage::with('sender:id,display_name')
                ->where(function ($q) use ($userId, $otherId) {
                    $q->where('sender_id', $userId)->where('recipient_id', $otherId);
                })->orWhere(function ($q) use ($userId, $otherId) {
                    $q->where('sender_id', $otherId)->where('recipient_id', $userId);
                })
                ->orderBy('created_at', 'asc')
                ->get();

            DirectMessage::where('sender_id', $otherId)
                ->where('recipient_id', $userId)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return response()->json(['messages' => $messages, 'other_id' => (int)$otherId]);
        }

        $conversations = DirectMessage::select(
            DB::raw("CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END AS other_id"),
            DB::raw("(SELECT display_name FROM users WHERE id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END LIMIT 1) AS other_name"),
            DB::raw("(SELECT role FROM users WHERE id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END LIMIT 1) AS other_role"),
            DB::raw("(SELECT content FROM direct_messages WHERE (sender_id = {$userId} AND recipient_id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END) OR (sender_id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END AND recipient_id = {$userId}) ORDER BY created_at DESC LIMIT 1) AS last_message"),
            DB::raw("(SELECT created_at FROM direct_messages WHERE (sender_id = {$userId} AND recipient_id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END) OR (sender_id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END AND recipient_id = {$userId}) ORDER BY created_at DESC LIMIT 1) AS last_time"),
            DB::raw("(SELECT COUNT(*) FROM direct_messages WHERE sender_id = CASE WHEN sender_id = {$userId} THEN recipient_id ELSE sender_id END AND recipient_id = {$userId} AND is_read = 0) AS unread")
        )->where('sender_id', $userId)
         ->orWhere('recipient_id', $userId)
         ->groupBy('other_id')
         ->orderBy('last_time', 'desc')
         ->get();

        $roleFilter = ($user->role === 'victim') ? " AND role != 'victim'" : '';
        $allUsers = User::select('id', 'display_name', 'role')
            ->where('id', '!=', $userId)
            ->whereRaw("1=1{$roleFilter}")
            ->orderBy('display_name')
            ->get();

        return response()->json(['conversations' => $conversations, 'all_users' => $allUsers]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'recipient_id' => 'required|integer|exists:users,id',
            'content' => 'required|string',
        ]);

        $user = $request->user();

        $recipient = User::find($request->recipient_id);
        if (!$recipient) {
            return response()->json(['error' => 'Recipient not found'], 404);
        }

        if ($user->role === 'victim' && $recipient->role === 'victim') {
            return response()->json(['error' => 'Victims can only message responders, operators, or admins'], 403);
        }

        $message = DirectMessage::create([
            'sender_id' => $user->id,
            'recipient_id' => $request->recipient_id,
            'content' => $request->content,
        ]);

        $message->load('sender:id,display_name');

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'dm_sent',
            'details' => "Direct message to user #{$request->recipient_id}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => $message], 201);
    }
}
