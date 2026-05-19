<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'audit_log';

    protected $fillable = [
        'user_id',
        'action',
        'details',
        'ip_address',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
