<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AuditLog;
use App\Models\DistressSignal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DistressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'victim') {
            $signals = DistressSignal::with(['victim', 'event'])
                ->where('victim_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            $signals = DistressSignal::with(['victim', 'event', 'assignee'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return response()->json(['signals' => $signals]);
    }

    public function show(int $id): JsonResponse
    {
        $signal = DistressSignal::with(['victim', 'event', 'assignee'])->find($id);

        if (!$signal) {
            return response()->json(['error' => 'Distress signal not found'], 404);
        }

        return response()->json(['signal' => $signal]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:500',
            'event_id' => 'nullable|integer|exists:emergency_events,id',
        ]);

        $user = $request->user();

        if ($user->role !== 'victim') {
            return response()->json(['error' => 'Only victims can send distress signals'], 403);
        }

        $signal = DistressSignal::create([
            'victim_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'location' => $request->location,
            'event_id' => $request->event_id,
            'status' => 'active',
        ]);

        if ($request->event_id) {
            Alert::create([
                'event_id' => $request->event_id,
                'type' => 'test',
                'target_role' => 'all',
                'title' => "Distress: {$request->title}",
                'message' => "Victim {$user->display_name} sent a distress signal: {$request->title}" . ($request->location ? " at {$request->location}" : ''),
            ]);
        }

        if (!empty($user->emergency_contact_name)) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'emergency_contact_notified',
                'details' => "Emergency contact {$user->emergency_contact_name} notified for distress signal #{$signal->id}",
                'ip_address' => $request->ip(),
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'email_simulated',
                'details' => "Simulated email/SMS to {$user->emergency_contact_name} ({$user->emergency_contact_phone}) for distress signal #{$signal->id}",
                'ip_address' => $request->ip(),
            ]);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'distress_sent',
            'details' => "Distress signal #{$signal->id}: {$request->title}",
            'ip_address' => $request->ip(),
        ]);

        $signal->load(['victim', 'event', 'assignee']);

        return response()->json([
            'signal' => $signal,
            'emergency_contact_notified' => !empty($user->emergency_contact_name),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $signal = DistressSignal::with(['victim', 'event', 'assignee'])->find($id);

        if (!$signal) {
            return response()->json(['error' => 'Distress signal not found'], 404);
        }

        $user = $request->user();

        if ($user->role === 'victim' && $signal->victim_id == $user->id) {
            if ($request->input('status') === 'resolved') {
                $signal->update(['status' => 'resolved']);
                AuditLog::create([
                    'user_id' => $user->id,
                    'action' => 'distress_resolved',
                    'details' => "Victim resolved distress signal #{$id}",
                    'ip_address' => $request->ip(),
                ]);
            }
        } elseif ($user->role !== 'victim') {
            $status = $request->input('status');
            if ($status === 'responded') {
                $signal->update(['assigned_to' => $user->id, 'status' => 'responded']);
                AuditLog::create([
                    'user_id' => $user->id,
                    'action' => 'distress_responded',
                    'details' => "Provider responded to distress signal #{$id}",
                    'ip_address' => $request->ip(),
                ]);
            } elseif ($status === 'resolved') {
                $signal->update(['status' => 'resolved']);
                AuditLog::create([
                    'user_id' => $user->id,
                    'action' => 'distress_resolved',
                    'details' => "Provider resolved distress signal #{$id}",
                    'ip_address' => $request->ip(),
                ]);
            }
        } else {
            return response()->json(['error' => 'Not authorized to update this signal'], 403);
        }

        $signal->refresh();

        return response()->json(['signal' => $signal]);
    }
}
