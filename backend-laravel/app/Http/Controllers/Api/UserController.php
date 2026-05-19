<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::select(['id', 'email', 'display_name', 'phone', 'role', 'is_active', 'avatar_url', 'emergency_contact_name', 'emergency_contact_phone', 'last_login', 'created_at']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('display_name')->get();

        return response()->json(['users' => $users]);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $data = $user->toArray();
        unset($data['google_id'], $data['password_hash'], $data['reset_token'], $data['reset_token_expires']);

        return response()->json(['user' => $data]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $currentUser = $request->user();
        $updateData = [];

        if ($request->has('role')) {
            $request->validate(['role' => 'string|in:admin,responder,operator,viewer,victim']);
            $updateData['role'] = $request->role;
            AuditLog::create([
                'user_id' => $currentUser->id,
                'action' => 'user_role_changed',
                'details' => "User {$id} role changed to {$request->role}",
                'ip_address' => $request->ip(),
            ]);
        }

        if ($request->has('is_active')) {
            $updateData['is_active'] = $request->boolean('is_active');
            AuditLog::create([
                'user_id' => $currentUser->id,
                'action' => 'user_status_changed',
                'details' => "User {$id} active status set to {$request->is_active}",
                'ip_address' => $request->ip(),
            ]);
        }

        $user->update($updateData);
        $user->refresh();

        $data = $user->toArray();
        unset($data['google_id'], $data['password_hash'], $data['reset_token'], $data['reset_token_expires']);

        return response()->json(['user' => $data]);
    }
}
