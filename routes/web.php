<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\ConfigurationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Menu\AvailabilityController;
use App\Http\Controllers\Menu\CategoryController;
use App\Http\Controllers\Menu\ModifierGroupController;
use App\Http\Controllers\Menu\ProductController;
use App\Http\Controllers\Menu\ProductImageController;
use App\Http\Controllers\Menu\ProductModifierGroupController;
use App\Http\Controllers\Menu\ProductVariantController;
use App\Http\Controllers\PinLoginController;
use App\Http\Controllers\StationController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::inertia('kiosk', 'kiosk/app')->name('kiosk.app');
Route::inertia('kitchen', 'kitchen/screen')->name('kitchen.screen');


Route::middleware('guest')->group(function () {
    Route::get('pin-login', [PinLoginController::class, 'create'])->name('pin-login');
    Route::post('pin-login', [PinLoginController::class, 'store'])->name('pin-login.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
    Route::post('users/{user}/reset-credentials', [UserController::class, 'resetCredentials'])->name('users.reset-credentials');

    Route::resource('configurations', ConfigurationController::class)
        ->only(['index', 'update'])
        ->parameters(['configurations' => 'group']);

    Route::resource('taxes', TaxController::class)->only(['index', 'store', 'update']);
    Route::resource('stations', StationController::class)->only(['index', 'store', 'update']);

    Route::prefix('menu')->name('menu.')->group(function () {
        Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
        Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update', 'destroy']);

        Route::resource('products', ProductController::class)->only(['index', 'store', 'edit', 'update', 'destroy']);
        Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
        Route::put('products/{product}/variants', [ProductVariantController::class, 'sync'])->name('products.variants.sync');
        Route::put('products/{product}/modifiers', [ProductModifierGroupController::class, 'sync'])->name('products.modifiers.sync');

        Route::controller(ProductImageController::class)->prefix('products/{product}/images')->name('products.images.')->group(function () {
            Route::post('/', 'store')->name('store');
            Route::patch('{image}/primary', 'primary')->name('primary');
            Route::delete('{image}', 'destroy')->name('destroy');
        });

        Route::resource('modifier-groups', ModifierGroupController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['modifier-groups' => 'group'])
            ->names('groups');
        Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/orders.php';
require __DIR__.'/shifts.php';
require __DIR__.'/inventory.php';
require __DIR__.'/kiosk.php';
require __DIR__.'/devices.php';