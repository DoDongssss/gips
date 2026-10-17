<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Support\Qty;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class LowStockController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:inventory.view')];
    }

    /** For the dashboard card and the header bell: everything at or under its reorder level, worst first. */
    public function __invoke(): JsonResponse
    {
        $items = Ingredient::query()->with(['baseUnit:id,abbreviation', 'stockLevel:ingredient_id,quantity'])
            ->where('is_active', true)->where('reorder_level', '>', 0)
            ->whereHas('stockLevel', fn ($s) => $s->whereColumn('stock_levels.quantity', '<=', 'ingredients.reorder_level'))
            ->get()
            ->map(fn (Ingredient $i) => [
                'id' => $i->id, 'name' => $i->name, 'unit' => $i->baseUnit?->abbreviation,
                'quantity' => Qty::fmt($i->stockLevel->quantity), 'reorder_level' => (string) $i->reorder_level,
                'is_negative' => (float) $i->stockLevel->quantity < 0,
            ])
            ->sortBy(fn ($i) => (float) $i['quantity'])->values();

        return response()->json(['count' => $items->count(), 'items' => $items]);
    }
}
