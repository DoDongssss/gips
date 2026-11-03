<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property int $base_unit_id
 * @property string $average_cost_cents  cost per base unit, fractional centavos
 * @property string $reorder_level
 * @property bool $is_active
 */
#[Fillable(['ingredient_category_id', 'name', 'sku', 'base_unit_id', 'purchase_unit_id', 'average_cost_cents', 'reorder_level', 'is_active'])]
class Ingredient extends Model
{
    use Audited, SoftDeletes;

    protected function casts(): array
    {
        return [
            'average_cost_cents' => 'decimal:4',
            'reorder_level' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Every ingredient always has one cached stock row.
        static::created(fn (Ingredient $i) => StockLevel::firstOrCreate(['ingredient_id' => $i->id], ['quantity' => 0]));
    }

    protected function auditAttributes(): array
    {
        return ['name', 'sku', 'base_unit_id', 'purchase_unit_id', 'reorder_level', 'is_active'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(IngredientCategory::class, 'ingredient_category_id');
    }

    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    public function purchaseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'purchase_unit_id');
    }

    public function stockLevel(): HasOne
    {
        return $this->hasOne(StockLevel::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
