<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['error' => 'Invalid email or password'], 401);
        }

        $user->update(['last_login' => now()]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'email_login',
            'details' => "User {$user->display_name} logged in via email",
            'ip_address' => $request->ip(),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
            'token' => $token,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'display_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|in:admin,responder,operator,viewer,victim',
        ]);

        if (User::where('email', $request->email)->exists()) {
            return response()->json(['error' => 'An account with this email already exists'], 409);
        }

        $role = $request->role ?? 'victim';

        if ($role === 'admin') {
            $adminCount = User::where('role', 'admin')->count();
            if ($adminCount > 0) {
                $role = 'responder';
            }
        }

        $user = User::create([
            'display_name' => $request->display_name,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'role' => $role,
            'is_active' => true,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'user_registered',
            'details' => "User {$user->display_name} registered as {$role}",
            'ip_address' => $request->ip(),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
            'token' => $token,
        ]);
    }

    public function devLogin(Request $request): JsonResponse
    {
        $request->validate([
            'display_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $email = $request->email ?? strtolower(str_replace(' ', '.', $request->display_name)) . '@local.dev';
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->update(['last_login' => now()]);
        } else {
            $user = User::create([
                'google_id' => 'dev_' . uniqid(),
                'email' => $email,
                'display_name' => $request->display_name,
                'role' => 'admin',
                'is_active' => true,
                'last_login' => now(),
            ]);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'dev_login',
            'details' => "Dev login: {$user->display_name}",
            'ip_address' => $request->ip(),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'user_logout',
                'details' => 'User logged out',
                'ip_address' => $request->ip(),
            ]);
            $user->currentAccessToken()->delete();
        }

        return response()->json(['success' => true]);
    }

    public function session(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Not authenticated'], 401);
        }

        return response()->json([
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
        ]);
    }

    public function googleUrl(): JsonResponse
    {
        $clientId = config('services.google.client_id');
        $redirectUri = config('services.google.redirect');

        if (!$clientId) {
            return response()->json(['error' => 'Google OAuth not configured'], 500);
        }

        $authUrl = 'https://accounts.google.com/o/oauth2/auth?' . http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'online',
        ]);

        return response()->json(['auth_url' => $authUrl]);
    }

    public function googleCallback(Request $request): JsonResponse
    {
        $code = $request->query('code');
        if (!$code) {
            return response()->json(['error' => 'No authorization code provided'], 400);
        }

        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $redirectUri = config('services.google.redirect');

        if (!$clientId || !$clientSecret) {
            return response()->json(['error' => 'Google OAuth not configured'], 500);
        }

        $response = Http::post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);

        $tokenData = $response->json();
        if (!$tokenData || !isset($tokenData['access_token'])) {
            return response()->json(['error' => 'Failed to exchange authorization code'], 401);
        }

        $userInfoResponse = Http::withToken($tokenData['access_token'])
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        $googleUser = $userInfoResponse->json();
        if (!$googleUser || !isset($googleUser['email'])) {
            return response()->json(['error' => 'Failed to fetch user info'], 401);
        }

        $user = User::where('google_id', $googleUser['id'])->orWhere('email', $googleUser['email'])->first();

        if ($user) {
            $user->update([
                'google_id' => $googleUser['id'],
                'avatar_url' => $googleUser['picture'] ?? $user->avatar_url,
                'last_login' => now(),
            ]);
        } else {
            $user = User::create([
                'google_id' => $googleUser['id'],
                'email' => $googleUser['email'],
                'display_name' => $googleUser['name'],
                'avatar_url' => $googleUser['picture'] ?? null,
                'role' => 'victim',
                'is_active' => true,
                'last_login' => now(),
            ]);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'user_login',
            'details' => "User {$user->display_name} logged in via Google",
            'ip_address' => $request->ip(),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $user = User::where('email', $request->email)->first();

        $response = ['success' => true, 'message' => 'If the email exists, a reset link has been sent'];

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $user->update([
                'reset_token' => $token,
                'reset_token_expires' => now()->addHour(),
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'forgot_password',
                'details' => "Password reset requested for {$user->display_name}",
                'ip_address' => $request->ip(),
            ]);

            $response['reset_token'] = $token;
        }

        return response()->json($response);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = User::where('reset_token', $request->token)
            ->where('reset_token_expires', '>', now())
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired reset token'], 400);
        }

        $user->update([
            'password_hash' => Hash::make($request->new_password),
            'reset_token' => null,
            'reset_token_expires' => null,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'reset_password',
            'details' => "Password reset for {$user->display_name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['success' => true]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $updateData = [];

        if ($request->filled('display_name')) {
            $updateData['display_name'] = trim($request->display_name);
        }

        if ($request->filled('email')) {
            $email = trim($request->email);
            if ($email !== $user->email) {
                if (User::where('email', $email)->exists()) {
                    return response()->json(['error' => 'Email already in use'], 409);
                }
                $updateData['email'] = $email;
            }
        }

        if ($request->has('phone')) {
            $updateData['phone'] = trim($request->phone);
        }

        if ($request->has('avatar_url')) {
            $updateData['avatar_url'] = trim($request->avatar_url);
        }

        if ($request->has('emergency_contact_name')) {
            $updateData['emergency_contact_name'] = trim($request->emergency_contact_name);
        }

        if ($request->has('emergency_contact_phone')) {
            $updateData['emergency_contact_phone'] = trim($request->emergency_contact_phone);
        }

        if ($request->filled('current_password') && $request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password_hash)) {
                return response()->json(['error' => 'Current password is incorrect'], 400);
            }
            if (strlen($request->new_password) < 6) {
                return response()->json(['error' => 'New password must be at least 6 characters'], 400);
            }
            $updateData['password_hash'] = Hash::make($request->new_password);
        }

        if (empty($updateData)) {
            return response()->json(['error' => 'No fields to update'], 400);
        }

        $user->update($updateData);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'profile_updated',
            'details' => 'Profile updated',
            'ip_address' => $request->ip(),
        ]);

        $user->refresh();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'phone' => $user->phone,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
            ],
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,gif,webp|max:5120',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $filename = 'avatar_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();

        $path = $file->storeAs('avatars', $filename, 'public');
        $avatarUrl = '/storage/' . $path;

        $user->update(['avatar_url' => $avatarUrl]);

        return response()->json([
            'success' => true,
            'avatar_url' => $avatarUrl,
        ]);
    }
}
