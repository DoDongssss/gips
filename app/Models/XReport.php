<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A mid-day snapshot. Kept for the record; it resets nothing. */
class XReport extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'business_date' => 'date:Y-m-d',
            'snapshot' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
