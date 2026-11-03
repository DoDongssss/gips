<?php

namespace App\Http\Requests\Inventory;

use App\Models\Ingredient;
use App\Services\Inventory\UnitConverter;

trait ChecksUnitConversion
{
    /** True when $unitId can be converted to the ingredient's base unit. */
    protected function convertsToBase(mixed $ingredientId, mixed $unitId): bool
    {
        $base = Ingredient::withTrashed()->whereKey($ingredientId)->value('base_unit_id');

        return $base !== null && app(UnitConverter::class)->canConvert((int) $unitId, (int) $base);
    }
}
