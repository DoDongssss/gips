<?php

use App\Http\Controllers\Menu\AvailabilityController;
use App\Http\Controllers\Menu\CategoryController;
use App\Http\Controllers\Menu\ModifierGroupController;
use App\Http\Controllers\Menu\ProductController;
use App\Http\Controllers\Menu\ProductImageController;
use App\Http\Controllers\Menu\ProductModifierGroupController;
use App\Http\Controllers\Menu\ProductVariantController;
use Illuminate\Support\Facades\Route;

// Menu catalog. Recipe routes (/menu/products/{product}/recipe) live in inventory.php.
Route::middleware(['auth', 'verified'])->prefix('menu')->name('menu.')->group(function () {
    // Categories
    Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
    Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update', 'destroy']);

    // Products
    Route::resource('products', ProductController::class)->only(['index', 'store', 'edit', 'update', 'destroy']);
    Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
    Route::put('products/{product}/variants', [ProductVariantController::class, 'sync'])->name('products.variants.sync');
    Route::put('products/{product}/modifiers', [ProductModifierGroupController::class, 'sync'])->name('products.modifiers.sync');

    Route::controller(ProductImageController::class)->prefix('products/{product}/images')->name('products.images.')->group(function () {
        Route::post('/', 'store')->name('store');
        Route::patch('{image}/primary', 'primary')->name('primary');
        Route::delete('{image}', 'destroy')->name('destroy');
    });

    // Modifier groups & modifiers
    Route::resource('modifier-groups', ModifierGroupController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['modifier-groups' => 'group'])
        ->names('groups');
    Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
});
