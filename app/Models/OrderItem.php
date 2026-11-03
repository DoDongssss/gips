<?php

namespace App\Models;

use App\Enums\OrderItemStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => OrderItemStatus::class,
            'unit_price_cents' => 'integer',
            'quantity' => 'integer',
            'modifiers_total_cents' => 'integer',
            'discount_cents' => 'integer',
            'tax_cents' => 'integer',
            'line_total_cents' => 'integer',
            'voided_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function modifiers(): HasMany
    {
        return $this->hasMany(OrderItemModifier::class);
    }
}
