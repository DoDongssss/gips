<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockAdjustmentRequest;
use App\Models\Ingredient;
use App\Services\Inventory\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class StockAdjustmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:inventory.adjust')];
    }

    public function store(StockAdjustmentRequest $request, Ingredient $ingredient, StockService $stock): RedirectResponse
    {
        $data = $request->validated();

        $stock->adjust($ingredient, $data['quantity_change'], $data['notes'], $request->user());

        return back()->with('success', "{$ingredient->name} stock adjusted.");
    }
}
