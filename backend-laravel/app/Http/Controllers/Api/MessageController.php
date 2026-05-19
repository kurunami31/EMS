<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['event_id' => 'required|integer|exists:emergency_events,id']);

        $format = $request->query('format', 'json');

        $messages = Message::with(['sender', 'attachments'])
            ->where('event_id', $request->event_id)
            ->orderBy('created_at', 'asc')
            ->get();

        if ($format === 'xml') {
            $xml = $this->messagesToXml($messages);
            return response($xml, 200)->header('Content-Type', 'application/xml');
        }

        return response()->json(['messages' => $messages]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'event_id' => 'required|integer|exists:emergency_events,id',
            'content' => 'required|string',
            'priority' => 'nullable|string|in:normal,high,urgent',
        ]);

        $user = $request->user();

        $priority = $request->priority ?? 'normal';
        if ($user->role === 'victim') {
            $priority = 'normal';
        }

        $message = Message::create([
            'event_id' => $request->event_id,
            'sender_id' => $user->id,
            'content' => $request->content,
            'message_type' => 'text',
            'priority' => $priority,
        ]);

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('message_attachments', $filename, 'public');

            MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => '/storage/' . $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);

            $message->load('attachments');
        }

        $message->load('sender');

        return response()->json(['message' => $message], 201);
    }

    private function messagesToXml($messages): string
    {
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

        return $dom->saveXML();
    }
}
