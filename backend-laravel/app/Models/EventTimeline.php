<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventTimeline extends Model
{
    public $timestamps = false;

    protected $table = 'event_timeline';

    protected $fillable = [
        'event_id',
        'action',
        'description',
        'user_id',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
