<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;

class AnnouncementController extends Controller
{
    public function index(): JsonResponse
    {
        $announcements = Announcement::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->orderBy('id', 'desc')->get();

        return response()->json(['announcements' => $announcements]);
    }
}
