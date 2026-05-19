<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\EventResource;
use App\Models\EventTimeline;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemController extends Controller
{
    public function health(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $dbStatus = 'connected';
        } catch (\Exception $e) {
            $dbStatus = 'disconnected';
        }

        $activeEvents = Event::where('status', 'active')->count();
        $activeAlerts = Alert::where('is_acknowledged', false)->count();
        $activeSignals = DB::table('distress_signals')->where('status', 'active')->count();
        $totalUsers = User::count();

        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'database' => $dbStatus,
            'statistics' => [
                'active_events' => $activeEvents,
                'active_alerts' => $activeAlerts,
                'active_distress_signals' => $activeSignals,
                'total_users' => $totalUsers,
            ],
        ]);
    }

    public function report(): JsonResponse
    {
        $today = now()->startOfDay();

        $eventsToday = Event::where('created_at', '>=', $today)->count();
        $messagesToday = Message::where('created_at', '>=', $today)->count();
        $alertsToday = Alert::where('created_at', '>=', $today)->count();
        $signalsToday = DB::table('distress_signals')->where('created_at', '>=', $today)->count();

        $eventsByStatus = Event::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')->pluck('total', 'status');

        $usersByRole = User::select('role', DB::raw('count(*) as total'))
            ->groupBy('role')->pluck('total', 'role');

        $recentLogs = AuditLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'date' => $today->toDateString(),
            'summary' => [
                'events_created_today' => $eventsToday,
                'messages_sent_today' => $messagesToday,
                'alerts_dispatched_today' => $alertsToday,
                'distress_signals_today' => $signalsToday,
            ],
            'events_by_status' => $eventsByStatus,
            'users_by_role' => $usersByRole,
            'recent_activity' => $recentLogs,
        ]);
    }

    public function archive(Request $request): JsonResponse
    {
        $days = (int)$request->query('days', 7);
        $cutoff = now()->subDays($days);

        $count = Event::where('status', 'resolved')
            ->where('updated_at', '<=', $cutoff)
            ->update(['status' => 'archived']);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'system_archive',
            'details' => "Archived {$count} events older than {$days} days",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'archived_count' => $count,
            'message' => "Archived {$count} events",
        ]);
    }

    public function escalate(Request $request): JsonResponse
    {
        $minutes = (int)$request->query('minutes', 30);
        $cutoff = now()->subMinutes($minutes);

        $unacknowledgedAlerts = Alert::where('is_acknowledged', false)
            ->where('created_at', '<=', $cutoff)
            ->get();

        $escalatedCount = 0;
        foreach ($unacknowledgedAlerts as $alert) {
            $alert->update(['type' => 'evacuation']);
            $escalatedCount++;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'system_escalate',
            'details' => "Escalated {$escalatedCount} unacknowledged alerts older than {$minutes} minutes",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'escalated_count' => $escalatedCount,
            'message' => "Escalated {$escalatedCount} unacknowledged alerts",
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('details', 'like', "%{$search}%");
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to);
        }

        $limit = (int)$request->query('limit', 100);
        $logs = $query->orderBy('created_at', 'desc')->limit($limit)->get();

        return response()->json(['logs' => $logs]);
    }

    public function exportCsv(Request $request)
    {
        $type = $request->query('type', '');

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $type . '.csv"',
        ];

        $callback = function () use ($type) {
            $fh = fopen('php://output', 'w');

            switch ($type) {
                case 'users':
                    fputcsv($fh, ['id', 'email', 'display_name', 'role', 'is_active', 'created_at']);
                    $users = User::select('id', 'email', 'display_name', 'role', 'is_active', 'created_at')
                        ->orderBy('id')->cursor();
                    foreach ($users as $user) {
                        fputcsv($fh, [$user->id, $user->email, $user->display_name, $user->role, $user->is_active, $user->created_at]);
                    }
                    break;

                case 'events':
                    fputcsv($fh, ['id', 'title', 'description', 'status', 'severity', 'location', 'created_at', 'created_by_name']);
                    $events = DB::table('emergency_events as e')
                        ->leftJoin('users as u', 'e.created_by', '=', 'u.id')
                        ->select('e.id', 'e.title', 'e.description', 'e.status', 'e.severity', 'e.location', 'e.created_at', 'u.display_name as created_by_name')
                        ->orderBy('e.id')->cursor();
                    foreach ($events as $event) {
                        fputcsv($fh, (array)$event);
                    }
                    break;

                case 'alerts':
                    fputcsv($fh, ['id', 'event_id', 'type', 'target_role', 'title', 'message', 'is_acknowledged', 'created_at']);
                    $alerts = Alert::select('id', 'event_id', 'type', 'target_role', 'title', 'message', 'is_acknowledged', 'created_at')
                        ->orderBy('id')->cursor();
                    foreach ($alerts as $alert) {
                        fputcsv($fh, [$alert->id, $alert->event_id, $alert->type, $alert->target_role, $alert->title, $alert->message, $alert->is_acknowledged, $alert->created_at]);
                    }
                    break;

                case 'messages':
                    fputcsv($fh, ['id', 'event_id', 'sender_id', 'content', 'message_type', 'priority', 'created_at']);
                    $messages = Message::select('id', 'event_id', 'sender_id', 'content', 'message_type', 'priority', 'created_at')
                        ->orderBy('id')->cursor();
                    foreach ($messages as $msg) {
                        fputcsv($fh, [$msg->id, $msg->event_id, $msg->sender_id, $msg->content, $msg->message_type, $msg->priority, $msg->created_at]);
                    }
                    break;

                default:
                    fputcsv($fh, ['error' => 'Invalid export type']);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function resources(Request $request): JsonResponse
    {
        $eventId = $request->query('event_id');

        if (!$eventId) {
            return response()->json(['error' => 'event_id required'], 400);
        }

        $resources = EventResource::where('event_id', $eventId)->orderBy('id')->get();

        return response()->json(['resources' => $resources]);
    }

    public function timeline(Request $request): JsonResponse
    {
        $eventId = $request->query('event_id');

        if (!$eventId) {
            return response()->json(['error' => 'event_id required'], 400);
        }

        $entries = EventTimeline::with('user')
            ->where('event_id', $eventId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['timeline' => $entries]);
    }

    public function exportXml(Request $request): JsonResponse
    {
        $eventId = (int)$request->query('event_id', 0);

        if (!$eventId) {
            return response()->json(['error' => 'event_id required'], 400);
        }

        $messages = Message::with('sender')
            ->where('event_id', $eventId)
            ->orderBy('created_at', 'asc')
            ->get();

        $dom = new \DOMDocument('1.0', 'UTF-8');
        $root = $dom->createElement('messages');
        $dom->appendChild($root);

        foreach ($messages as $msg) {
            $el = $dom->createElement('message');
            $el->appendChild($dom->createElement('id', $msg->id));
            $el->appendChild($dom->createElement('event_id', $msg->event_id));
            $el->appendChild($dom->createElement('sender', htmlspecialchars($msg->sender->display_name ?? 'Unknown')));
            $el->appendChild($dom->createElement('content', htmlspecialchars($msg->content)));
            $el->appendChild($dom->createElement('priority', $msg->priority));
            $el->appendChild($dom->createElement('created_at', $msg->created_at->toIso8601String()));
            $root->appendChild($el);
        }

        return response($dom->saveXML(), 200)->header('Content-Type', 'application/xml');
    }

    public function importXml(Request $request): JsonResponse
    {
        $xml = $request->getContent();

        if (!$xml) {
            return response()->json(['error' => 'XML data required'], 400);
        }

        try {
            $dom = new \DOMDocument();
            $dom->loadXML($xml);
            $messages = $dom->getElementsByTagName('message');

            $imported = 0;
            foreach ($messages as $msgNode) {
                $eventId = (int)$msgNode->getElementsByTagName('event_id')->item(0)?->nodeValue ?? 0;
                $content = $msgNode->getElementsByTagName('content')->item(0)?->nodeValue ?? '';
                $priority = $msgNode->getElementsByTagName('priority')->item(0)?->nodeValue ?? 'normal';

                if ($eventId && $content) {
                    $eventExists = DB::table('emergency_events')->where('id', $eventId)->exists();
                    if (!$eventExists) continue;

                    Message::create([
                        'event_id' => $eventId,
                        'sender_id' => $request->user()->id,
                        'content' => $content,
                        'priority' => $priority,
                    ]);
                    $imported++;
                }
            }

            return response()->json([
                'success' => true,
                'imported_count' => $imported,
                'message' => "Imported {$imported} messages",
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid XML: ' . $e->getMessage()], 400);
        }
    }

    public function retryDeadLetter(Request $request): JsonResponse
    {
        $items = DB::table('dead_letter_queue')
            ->where('retry_count', '<', 3)
            ->limit(10)
            ->get();

        $retried = 0;
        foreach ($items as $item) {
            DB::table('dead_letter_queue')
                ->where('id', $item->id)
                ->update(['retry_count' => $item->retry_count + 1]);
            $retried++;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'retry_dead_letter',
            'details' => "Retried {$retried} dead letter queue items",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'retried_count' => $retried,
            'message' => "Retried {$retried} dead letter queue items",
        ]);
    }

    public function addResource(Request $request): JsonResponse
    {
        $eventId = (int)$request->query('event_id', 0);
        if (!$eventId) {
            return response()->json(['error' => 'event_id required'], 400);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:personnel,equipment,supplies',
            'quantity' => 'required|integer|min:1',
        ]);

        $resource = EventResource::create([
            'event_id' => $eventId,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'quantity' => $validated['quantity'],
            'assigned_by' => $request->user()->id,
            'status' => 'active',
        ]);

        return response()->json(['resource' => $resource, 'success' => true], 201);
    }
}
