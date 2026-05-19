<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\EventTimeline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Event::with('creator');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $events = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['events' => $events]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'severity' => 'nullable|string|in:critical,high,medium,low',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $event = Event::create([
            'title' => $request->title,
            'severity' => $request->severity ?? 'medium',
            'description' => $request->description,
            'location' => $request->location,
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        EventTimeline::create([
            'event_id' => $event->id,
            'action' => 'Event Created',
            'description' => "Event '{$request->title}' created with severity {$request->severity}",
            'user_id' => $user->id,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'event_created',
            'details' => "Event '{$request->title}' created with severity {$request->severity}",
            'ip_address' => $request->ip(),
        ]);

        $event->load('creator');

        return response()->json(['event' => $event], 201);
    }

    public function show(int $id): JsonResponse
    {
        $event = Event::with('creator')->find($id);

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        return response()->json(['event' => $event]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $event = Event::find($id);

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $user = $request->user();

        $updateData = [];

        if ($request->has('title')) {
            $updateData['title'] = $request->title;
        }
        if ($request->has('severity')) {
            $updateData['severity'] = $request->severity;
        }
        if ($request->has('description')) {
            $updateData['description'] = $request->description;
        }
        if ($request->has('location')) {
            $updateData['location'] = $request->location;
        }
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
            if ($request->status === 'resolved') {
                $updateData['resolved_by'] = $user->id;
                $updateData['resolved_at'] = now();
            }
        }

        $event->update($updateData);
        $event->load('creator');

        if ($request->status === 'resolved') {
            EventTimeline::create([
                'event_id' => $event->id,
                'action' => 'Event Resolved',
                'description' => "Event #{$event->id} resolved by {$user->display_name}",
                'user_id' => $user->id,
            ]);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'event_updated',
            'details' => "Event {$id} updated",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['event' => $event]);
    }
}
