<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderTax extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'is_inclusive' => 'boolean',
            'taxable_cents' => 'integer',
            'tax_cents' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
