<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'sender_id',
        'content',
        'message_type',
        'priority',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function attachments()
    {
        return $this->hasMany(MessageAttachment::class, 'message_id');
    }
}
