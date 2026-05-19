<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'type',
        'target_role',
        'title',
        'message',
        'is_acknowledged',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'is_acknowledged' => 'boolean',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function acknowledger()
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
