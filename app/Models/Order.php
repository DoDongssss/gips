<?php

namespace App\Models;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Written only by the order services, never filled straight from a request,
 * so the model is unguarded. Orders are never deleted: they are voided or cancelled.
 */
class Order extends Model
{
    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(fn (Order $o) => $o->uuid ??= (string) Str::uuid());
    }

    protected function casts(): array
    {
        return [
            'business_date' => 'date:Y-m-d',
            'channel' => OrderChannel::class,
            'type' => OrderType::class,
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'requires_verification' => 'boolean',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('id');
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }

    public function taxes(): HasMany
    {
        return $this->hasMany(OrderTax::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('id');
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class)->orderBy('id');
    }

    public function balanceCents(): int
    {
        return max(0, $this->total_cents - $this->paid_cents);
    }
}
