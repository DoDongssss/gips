<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\ConfigurationController;
use App\Http\Controllers\Menu\AvailabilityController;
use App\Http\Controllers\Menu\CategoryController;
use App\Http\Controllers\Menu\ProductController;
use App\Http\Controllers\Menu\ProductImageController;
use App\Http\Controllers\Menu\ProductModifierGroupController;
use App\Http\Controllers\Menu\ModifierGroupController;
use App\Http\Controllers\Menu\ProductVariantController;
use App\Http\Controllers\PinLoginController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    
    // users route
    Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
    Route::post('users/{user}/reset-credentials', [UserController::class, 'resetCredentials'])
        ->name('users.reset-credentials');

    // configuration route
    Route::resource('configurations', ConfigurationController::class)->only(['index', 'update']);

    // audit routes
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    Route::prefix('menu')->name('menu.')->group(function () {
        // Categories
        Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

        // Products
        Route::get('products', [ProductController::class, 'index'])->name('products.index');
        Route::post('products', [ProductController::class, 'store'])->name('products.store');
        Route::get('products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
        Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');

        // Product tabs
        Route::put('products/{product}/variants', [ProductVariantController::class, 'sync'])->name('products.variants.sync');
        Route::put('products/{product}/modifiers', [ProductModifierGroupController::class, 'sync'])->name('products.modifiers.sync');
        Route::post('products/{product}/images', [ProductImageController::class, 'store'])->name('products.images.store');
        Route::patch('products/{product}/images/{image}/primary', [ProductImageController::class, 'primary'])->name('products.images.primary');
        Route::delete('products/{product}/images/{image}', [ProductImageController::class, 'destroy'])->name('products.images.destroy');

        // Modifier groups (named "groups" to keep generated Wayfinder paths simple)
        Route::get('modifier-groups', [ModifierGroupController::class, 'index'])->name('groups.index');
        Route::post('modifier-groups', [ModifierGroupController::class, 'store'])->name('groups.store');
        Route::put('modifier-groups/{group}', [ModifierGroupController::class, 'update'])->name('groups.update');
        Route::delete('modifier-groups/{group}', [ModifierGroupController::class, 'destroy'])->name('groups.destroy');
        Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
    });

});

Route::middleware('guest')->group(function () {
    Route::get('pin-login', [PinLoginController::class, 'create'])->name('pin-login');
    Route::post('pin-login', [PinLoginController::class, 'store'])->name('pin-login.store');
});

require __DIR__.'/settings.php';
require __DIR__.'/orders.php';