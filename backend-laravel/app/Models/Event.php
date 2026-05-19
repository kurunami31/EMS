<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $table = 'emergency_events';

    protected $fillable = [
        'title',
        'severity',
        'description',
        'location',
        'status',
        'created_by',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'event_id');
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class, 'event_id');
    }

    public function resources()
    {
        return $this->hasMany(EventResource::class, 'event_id');
    }

    public function timeline()
    {
        return $this->hasMany(EventTimeline::class, 'event_id');
    }

    public function distressSignals()
    {
        return $this->hasMany(DistressSignal::class, 'event_id');
    }
}
