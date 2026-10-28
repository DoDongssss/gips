<?php

namespace App\Services\Inventory;

use App\Models\Ingredient;
use App\Support\Qty;
use Illuminate\Support\Collection;

/** Ingredients at or under their reorder level, worst first. Same rule and shape as LowStockController. */
class LowStockReport
{
    /** @return Collection<int, array{id:int,name:string,unit:?string,quantity:string,reorder_level:string,is_negative:bool}> */
    public function items(): Collection
    {
        return Ingredient::query()->with(['baseUnit:id,abbreviation', 'stockLevel:ingredient_id,quantity'])
            ->where('is_active', true)->where('reorder_level', '>', 0)
            ->whereHas('stockLevel', fn ($s) => $s->whereColumn('stock_levels.quantity', '<=', 'ingredients.reorder_level'))
            ->get()
            ->map(fn (Ingredient $i) => [
                'id' => $i->id, 'name' => $i->name, 'unit' => $i->baseUnit?->abbreviation,
                'quantity' => Qty::fmt($i->stockLevel->quantity), 'reorder_level' => (string) $i->reorder_level,
                'is_negative' => (float) $i->stockLevel->quantity < 0,
            ])
            ->sortBy(fn ($i) => (float) $i['quantity'])->values();
    }
}
