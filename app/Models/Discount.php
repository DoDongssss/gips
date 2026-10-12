<?php

namespace App\Models;

use App\Enums\DiscountScope;
use App\Enums\DiscountType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'code', 'type', 'value', 'applies_to', 'requires_id', 'requires_approval', 'is_vat_exempt', 'is_active', 'starts_at', 'ends_at'])]
class Discount extends Model
{
    protected function casts(): array
    {
        return [
            'type' => DiscountType::class,
            'applies_to' => DiscountScope::class,
            'value' => 'integer',
            'requires_id' => 'boolean',
            'requires_approval' => 'boolean',
            'is_vat_exempt' => 'boolean',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    /** Active and inside its start/end window. */
    public function scopeUsable(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }
}
