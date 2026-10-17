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

// Include from routes/web.php:  require __DIR__.'/inventory.php';
// Permissions are enforced by each controller's middleware().
Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('inventory')->name('inventory.')->group(function () {
        // Units, conversions, categories
        Route::get('units', [UnitController::class, 'index'])->name('units.index');
        Route::post('units', [UnitController::class, 'store'])->name('units.store');
        Route::put('units/{unit}', [UnitController::class, 'update'])->name('units.update');
        Route::delete('units/{unit}', [UnitController::class, 'destroy'])->name('units.destroy');
        Route::post('unit-conversions', [UnitConversionController::class, 'store'])->name('conversions.store');
        Route::delete('unit-conversions/{conversion}', [UnitConversionController::class, 'destroy'])->name('conversions.destroy');
        Route::post('ingredient-categories', [IngredientCategoryController::class, 'store'])->name('categories.store');
        Route::put('ingredient-categories/{category}', [IngredientCategoryController::class, 'update'])->name('categories.update');
        Route::delete('ingredient-categories/{category}', [IngredientCategoryController::class, 'destroy'])->name('categories.destroy');

        // Ingredients and stock
        Route::get('ingredients', [IngredientController::class, 'index'])->name('ingredients.index');
        Route::get('ingredients/options', [IngredientController::class, 'options'])->name('ingredients.options');
        Route::post('ingredients', [IngredientController::class, 'store'])->name('ingredients.store');
        Route::put('ingredients/{ingredient}', [IngredientController::class, 'update'])->name('ingredients.update');
        Route::delete('ingredients/{ingredient}', [IngredientController::class, 'destroy'])->name('ingredients.destroy');
        Route::post('ingredients/{ingredient}/adjust', [StockAdjustmentController::class, 'store'])->name('ingredients.adjust');
        Route::get('movements', [StockMovementController::class, 'index'])->name('movements.index');
        Route::get('low-stock', LowStockController::class)->name('low-stock');

        // Waste
        Route::get('waste', [WasteController::class, 'index'])->name('waste.index');
        Route::post('waste', [WasteController::class, 'store'])->name('waste.store');

        // Stock counts
        Route::get('counts', [StockCountController::class, 'index'])->name('counts.index');
        Route::post('counts', [StockCountController::class, 'store'])->name('counts.store');
        Route::get('counts/{count}', [StockCountController::class, 'show'])->name('counts.show');
        Route::put('counts/{count}', [StockCountController::class, 'update'])->name('counts.update');
        Route::post('counts/{count}/complete', [StockCountController::class, 'complete'])->name('counts.complete');

        // Suppliers
        Route::get('suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
        Route::post('suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
        Route::get('suppliers/{supplier}', [SupplierController::class, 'show'])->name('suppliers.show');
        Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
        Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');
        Route::post('suppliers/{supplier}/prices', [SupplierController::class, 'savePrice'])->name('suppliers.prices.save');
        Route::delete('suppliers/{supplier}/prices/{price}', [SupplierController::class, 'destroyPrice'])->name('suppliers.prices.destroy');

        // Purchase orders
        Route::get('purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
        Route::get('purchase-orders/create', [PurchaseOrderController::class, 'create'])->name('purchase-orders.create');
        Route::post('purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
        Route::get('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->name('purchase-orders.show');
        Route::get('purchase-orders/{purchaseOrder}/edit', [PurchaseOrderController::class, 'edit'])->name('purchase-orders.edit');
        Route::put('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update'])->name('purchase-orders.update');
        Route::post('purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])->name('purchase-orders.send');
        Route::post('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');

        // Goods receiving
        Route::get('receipts', [GoodsReceiptController::class, 'index'])->name('receipts.index');
        Route::get('receipts/create', [GoodsReceiptController::class, 'create'])->name('receipts.create');
        Route::post('receipts', [GoodsReceiptController::class, 'store'])->name('receipts.store');
        Route::get('receipts/{receipt}', [GoodsReceiptController::class, 'show'])->name('receipts.show');

        // Cost reports
        Route::get('reports', [InventoryReportController::class, 'index'])->name('reports.index');
    });

    // Recipe editor lives on the product page and the modifier tab.
    Route::get('menu/products/{product}/recipe', [RecipeController::class, 'show'])->name('recipes.show');
    Route::put('menu/products/{product}/recipe', [RecipeController::class, 'update'])->name('recipes.update');
    Route::get('menu/modifiers/{modifier}/recipe', [ModifierRecipeController::class, 'show'])->name('modifier-recipes.show');
    Route::put('menu/modifiers/{modifier}/recipe', [ModifierRecipeController::class, 'update'])->name('modifier-recipes.update');
});
