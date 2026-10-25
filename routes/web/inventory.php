<?php

use App\Http\Controllers\Inventory\GoodsReceiptController;
use App\Http\Controllers\Inventory\IngredientCategoryController;
use App\Http\Controllers\Inventory\IngredientController;
use App\Http\Controllers\Inventory\InventoryReportController;
use App\Http\Controllers\Inventory\LowStockController;
use App\Http\Controllers\Inventory\ModifierRecipeController;
use App\Http\Controllers\Inventory\PurchaseOrderController;
use App\Http\Controllers\Inventory\RecipeController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Inventory\StockCountController;
use App\Http\Controllers\Inventory\StockMovementController;
use App\Http\Controllers\Inventory\SupplierController;
use App\Http\Controllers\Inventory\UnitConversionController;
use App\Http\Controllers\Inventory\UnitController;
use App\Http\Controllers\Inventory\WasteController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('inventory')->name('inventory.')->group(function () {
        // ── Setup: units, conversions, categories
        Route::resource('units', UnitController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('unit-conversions', UnitConversionController::class)
            ->only(['store', 'destroy'])
            ->parameters(['unit-conversions' => 'conversion'])
            ->names('conversions');
        Route::resource('ingredient-categories', IngredientCategoryController::class)
            ->only(['store', 'update', 'destroy'])
            ->parameters(['ingredient-categories' => 'category'])
            ->names('categories');

        // ── Ingredients & stock levels
        Route::get('ingredients/options', [IngredientController::class, 'options'])->name('ingredients.options');
        Route::resource('ingredients', IngredientController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('ingredients/{ingredient}/adjust', [StockAdjustmentController::class, 'store'])->name('ingredients.adjust');
        Route::get('movements', [StockMovementController::class, 'index'])->name('movements.index');
        Route::get('low-stock', LowStockController::class)->name('low-stock');

        // ── Waste & stock counts
        Route::resource('waste', WasteController::class)->only(['index', 'store']);
        Route::post('counts/{count}/complete', [StockCountController::class, 'complete'])->name('counts.complete');
        Route::resource('counts', StockCountController::class)->only(['index', 'store', 'show', 'update']);

        // ── Purchasing: suppliers, purchase orders, goods receipts
        Route::resource('suppliers', SupplierController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('suppliers/{supplier}/prices', [SupplierController::class, 'savePrice'])->name('suppliers.prices.save');
        Route::delete('suppliers/{supplier}/prices/{price}', [SupplierController::class, 'destroyPrice'])->name('suppliers.prices.destroy');

        Route::resource('purchase-orders', PurchaseOrderController::class)
            ->except('destroy')
            ->parameters(['purchase-orders' => 'purchaseOrder']);
        Route::post('purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])->name('purchase-orders.send');
        Route::post('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');

        Route::resource('receipts', GoodsReceiptController::class)->only(['index', 'create', 'store', 'show']);

        // ── Reports
        Route::get('reports', [InventoryReportController::class, 'index'])->name('reports.index');
    });

    // ── Recipes: URLs live under /menu but route names stay un-prefixed (recipes.*, modifier-recipes.*).
    Route::prefix('menu')->group(function () {
        Route::get('products/{product}/recipe', [RecipeController::class, 'show'])->name('recipes.show');
        Route::put('products/{product}/recipe', [RecipeController::class, 'update'])->name('recipes.update');
        Route::get('modifiers/{modifier}/recipe', [ModifierRecipeController::class, 'show'])->name('modifier-recipes.show');
        Route::put('modifiers/{modifier}/recipe', [ModifierRecipeController::class, 'update'])->name('modifier-recipes.update');
    });
});
