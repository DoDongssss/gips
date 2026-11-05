<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Customer extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'loyalty_points',
        'notes',
    ];

    protected static function booted(): void
    {
        static::creating(fn (Customer $customer) => $customer->uuid ??= (string) Str::uuid());
    }

    protected function casts(): array
    {
        return [
            'loyalty_points' => 'integer',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class)->latest();
    }
}
