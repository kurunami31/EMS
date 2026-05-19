<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Alert::with('event');

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->event_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $alerts = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['alerts' => $alerts]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'event_id' => 'required|integer|exists:emergency_events,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'nullable|string|in:evacuation,lockdown,medical,fire,weather,security,test',
            'target_role' => 'nullable|string|in:admin,responder,operator,viewer,all',
        ]);

        $user = $request->user();

        $alert = Alert::create([
            'event_id' => $request->event_id,
            'type' => $request->type ?? 'test',
            'target_role' => $request->target_role ?? 'all',
            'title' => $request->title,
            'message' => $request->message,
            'is_acknowledged' => false,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'alert_created',
            'details' => "Alert '{$request->title}' created for event #{$request->event_id}",
            'ip_address' => $request->ip(),
        ]);

        $alert->load('event');

        return response()->json(['alert' => $alert], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $alert = Alert::find($id);

        if (!$alert) {
            return response()->json(['error' => 'Alert not found'], 404);
        }

        $user = $request->user();

        $alert->update([
            'is_acknowledged' => true,
            'acknowledged_by' => $user->id,
            'acknowledged_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'alert_acknowledged',
            'details' => "Alert #{$id} acknowledged",
            'ip_address' => $request->ip(),
        ]);

        $alert->load('event');

        return response()->json(['success' => true]);
    }
}
