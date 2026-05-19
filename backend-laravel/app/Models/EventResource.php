<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventResource extends Model
{
    protected $table = 'event_resources';

    protected $fillable = [
        'event_id',
        'type',
        'name',
        'quantity',
        'status',
        'assigned_by',
        'notes',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
