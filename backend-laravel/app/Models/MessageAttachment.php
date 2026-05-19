<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageAttachment extends Model
{
    public $timestamps = false;

    protected $table = 'message_attachments';

    protected $fillable = [
        'message_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    public function message()
    {
        return $this->belongsTo(Message::class, 'message_id');
    }
}
