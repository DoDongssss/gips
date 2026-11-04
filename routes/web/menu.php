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
    Route::get('categories/export', [CategoryController::class, 'export'])->name('categories.export');
    Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
    Route::post('categories/bulk', [CategoryController::class, 'bulk'])->name('categories.bulk');
    Route::post('categories/{category}/move', [CategoryController::class, 'move'])->name('categories.move');
    Route::post('categories/{category}/duplicate', [CategoryController::class, 'duplicate'])->name('categories.duplicate');
    Route::post('categories/{category}/restore', [CategoryController::class, 'restore'])->name('categories.restore');
    Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update', 'destroy']);

    // Products
    Route::get('products/export', [ProductController::class, 'export'])->name('products.export');
    Route::post('products/reorder', [ProductController::class, 'reorder'])->name('products.reorder');
    Route::post('products/{product}/move', [ProductController::class, 'move'])->name('products.move');
    Route::post('products/bulk', [ProductController::class, 'bulk'])->name('products.bulk');
    Route::post('products/{product}/duplicate', [ProductController::class, 'duplicate'])->name('products.duplicate');
    Route::post('products/{product}/restore', [ProductController::class, 'restore'])->name('products.restore');
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
    Route::get('modifier-groups/export', [ModifierGroupController::class, 'export'])->name('groups.export');
    Route::post('modifier-groups/reorder', [ModifierGroupController::class, 'reorder'])->name('groups.reorder');
    Route::post('modifier-groups/bulk', [ModifierGroupController::class, 'bulk'])->name('groups.bulk');
    Route::post('modifier-groups/{group}/move', [ModifierGroupController::class, 'move'])->name('groups.move');
    Route::post('modifier-groups/{group}/duplicate', [ModifierGroupController::class, 'duplicate'])->name('groups.duplicate');
    Route::post('modifier-groups/{group}/restore', [ModifierGroupController::class, 'restore'])->name('groups.restore');
    Route::resource('modifier-groups', ModifierGroupController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['modifier-groups' => 'group'])
        ->names('groups');
    Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
});
