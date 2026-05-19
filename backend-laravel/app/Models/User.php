<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'google_id',
        'email',
        'display_name',
        'password_hash',
        'phone',
        'role',
        'is_active',
        'avatar_url',
        'emergency_contact_name',
        'emergency_contact_phone',
        'reset_token',
        'reset_token_expires',
        'last_login',
    ];

    protected $hidden = [
        'password_hash',
        'reset_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login' => 'datetime',
        ];
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function eventsCreated()
    {
        return $this->hasMany(Event::class, 'created_by');
    }

    public function messagesSent()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }
}
