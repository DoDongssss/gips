<?php

namespace App\Models;

use App\Enums\PaymentRecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Payment extends Model
{
    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(fn (Payment $p) => $p->uuid ??= (string) Str::uuid());
    }

    protected function casts(): array
    {
        return [
            'status' => PaymentRecordStatus::class,
            'amount_cents' => 'integer',
            'tendered_cents' => 'integer',
            'change_cents' => 'integer',
            'tip_cents' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }
}
