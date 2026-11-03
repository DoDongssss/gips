<?php

namespace App\Models;

use App\Enums\ReceiptType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'type' => ReceiptType::class,
            'content' => 'array',
            'printed_count' => 'integer',
            'last_printed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
