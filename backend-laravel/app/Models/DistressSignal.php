<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistressSignal extends Model
{
    protected $table = 'distress_signals';

    protected $fillable = [
        'victim_id',
        'event_id',
        'title',
        'description',
        'location',
        'status',
        'assigned_to',
    ];

    public function victim()
    {
        return $this->belongsTo(User::class, 'victim_id');
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
