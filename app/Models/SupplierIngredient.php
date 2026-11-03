<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['supplier_id', 'ingredient_id', 'supplier_sku', 'unit_id', 'unit_cost_cents', 'is_preferred'])]
class SupplierIngredient extends Model
{
    protected function casts(): array
    {
        return ['unit_cost_cents' => 'integer', 'is_preferred' => 'boolean'];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
