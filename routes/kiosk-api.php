<?php

use App\Http\Controllers\Api\V1\Kiosk\KioskController;
use App\Http\Controllers\Api\V1\Kiosk\KioskOrderController;
use App\Http\Controllers\Api\V1\Kiosk\KioskSessionController;
use App\Http\Controllers\Api\V1\OrderEditController;
use App\Http\Controllers\Api\V1\PosKioskOrdersController;
use App\Http\Middleware\EnsureKioskDevice;
use Illuminate\Support\Facades\Route;

// What the kiosk tablet calls: /api/v1/kiosk/*
// Include at the bottom of routes/api.php:  require __DIR__.'/kiosk-api.php';
// Route names must start with kiosk.api. (BlockDeviceTokensOutsideKiosk relies on that).
Route::prefix('v1/kiosk')->name('kiosk.api.')->group(function () {
    // Public, throttled: trade the one-time pairing code for a token.
    Route::post('pair', [KioskController::class, 'pair'])->middleware('throttle:10,1')->name('pair');

    Route::middleware('auth:sanctum')->group(function () {
        // Read-only: menu:read
        Route::middleware(EnsureKioskDevice::class.':menu:read')->group(function () {
            Route::get('status', [KioskController::class, 'status'])->name('status');
            Route::post('heartbeat', [KioskController::class, 'heartbeat'])->name('heartbeat');
            Route::get('menu', [KioskController::class, 'menu'])->name('menu');
            Route::get('screens', [KioskController::class, 'screens'])->name('screens');
            Route::post('upsell', [KioskController::class, 'upsell'])->name('upsell');
        });

        // Placing an order: orders:create
        Route::middleware(EnsureKioskDevice::class.':orders:create')->group(function () {
            Route::post('sessions', [KioskSessionController::class, 'start'])->name('sessions.start');
            Route::post('sessions/{uuid}/end', [KioskSessionController::class, 'end'])->name('sessions.end');
            Route::post('orders', [KioskOrderController::class, 'store'])->middleware('throttle:30,1')->name('orders.store');
        });
    });
});

Route::middleware(['web', 'auth'])->group(function () {
    Route::get('v1/pos/kiosk-orders', PosKioskOrdersController::class)->name('pos.kiosk-orders');
    Route::get('v1/pos/orders/{order}/lines', [OrderEditController::class, 'show'])->name('pos.orders.lines.show');
    Route::post('v1/pos/orders/{order}/lines', [OrderEditController::class, 'update'])->name('pos.orders.lines.update');
    Route::get('v1/pos/orders/{order}/cart', [OrderEditController::class, 'cart'])->name('pos.orders.cart');
    Route::post('v1/pos/orders/{order}/update', [OrderEditController::class, 'update'])->name('pos.orders.update');
});

