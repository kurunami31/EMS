<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DirectMessageController;
use App\Http\Controllers\Api\DistressController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\HotlineController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/email-login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/dev-login', [AuthController::class, 'devLogin']);
Route::get('/auth/google/url', [AuthController::class, 'googleUrl']);
Route::get('/auth/google/callback', [AuthController::class, 'googleCallback']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/system/health', [SystemController::class, 'health']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);

    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::get('/events/{id}', [EventController::class, 'show']);
    Route::put('/events/{id}', [EventController::class, 'update']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);

    Route::get('/alerts', [AlertController::class, 'index']);
    Route::post('/alerts', [AlertController::class, 'store']);
    Route::put('/alerts/{id}', [AlertController::class, 'update']);

    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);

    Route::get('/distress', [DistressController::class, 'index']);
    Route::get('/distress/{id}', [DistressController::class, 'show']);
    Route::post('/distress', [DistressController::class, 'store']);
    Route::put('/distress/{id}', [DistressController::class, 'update']);

    Route::get('/direct-messages', [DirectMessageController::class, 'index']);
    Route::post('/direct-messages', [DirectMessageController::class, 'store']);

    Route::get('/hotlines', [HotlineController::class, 'index']);

    Route::get('/announcements', [AnnouncementController::class, 'index']);

    Route::get('/system/report', [SystemController::class, 'report']);
    Route::post('/system/archive', [SystemController::class, 'archive']);
    Route::post('/system/escalate', [SystemController::class, 'escalate']);
    Route::get('/system/logs', [SystemController::class, 'logs']);
    Route::get('/system/export-csv', [SystemController::class, 'exportCsv']);
    Route::get('/system/resources', [SystemController::class, 'resources']);
    Route::get('/system/timeline', [SystemController::class, 'timeline']);
    Route::get('/system/export-xml', [SystemController::class, 'exportXml']);
    Route::post('/system/import-xml', [SystemController::class, 'importXml']);
    Route::post('/system/retry-dead-letter', [SystemController::class, 'retryDeadLetter']);
    Route::post('/system/add-resource', [SystemController::class, 'addResource']);
});
