<?php

use App\Http\Controllers\Api\V1\Kiosk\KioskController;
use App\Http\Controllers\Api\V1\Kiosk\KioskOrderController;
use App\Http\Controllers\Api\V1\Kiosk\KioskSessionController;
use App\Http\Controllers\Api\V1\KioskAlertController;
use App\Http\Controllers\Api\V1\OrderEditController;
use App\Http\Controllers\Api\V1\OrderStockReturnController;
use App\Http\Controllers\Api\V1\PosKioskOrdersController;
use App\Http\Middleware\EnsureKioskDevice;
use Illuminate\Support\Facades\Route;

// Route names must start with "kiosk.api." (BlockDeviceTokensOutsideKiosk relies on it).
Route::prefix('v1/kiosk')->name('kiosk.api.')->group(function () {
    Route::post('pair', [KioskController::class, 'pair'])->middleware('throttle:10,1')->name('pair');

    Route::middleware('auth:sanctum')->group(function () {
        Route::middleware(EnsureKioskDevice::class.':menu:read')
            ->controller(KioskController::class)
            ->group(function () {
                Route::get('status', 'status')->name('status');
                Route::post('heartbeat', 'heartbeat')->name('heartbeat');
                Route::get('menu', 'menu')->name('menu');
                Route::get('screens', 'screens')->name('screens');
                Route::post('upsell', 'upsell')->name('upsell');
            });

        Route::middleware(EnsureKioskDevice::class.':orders:create')->group(function () {
            Route::post('sessions', [KioskSessionController::class, 'start'])->name('sessions.start');
            Route::post('sessions/{uuid}/end', [KioskSessionController::class, 'end'])->whereUuid('uuid')->name('sessions.end');
            Route::post('orders', [KioskOrderController::class, 'store'])->middleware('throttle:30,1')->name('orders.store');
        });
    });
});

Route::middleware(['web', 'auth'])->prefix('v1')->group(function () {
    Route::middleware('permission:order.create')->group(function () {
        Route::get('pos/kiosk-orders', PosKioskOrdersController::class)->name('pos.kiosk-orders');
        Route::get('pos/orders/{order}/cart', [OrderEditController::class, 'cart'])->name('pos.orders.cart');
        Route::post('pos/orders/{order}/update', [OrderEditController::class, 'update'])->name('pos.orders.update');
    });

    Route::get('pos/kiosk-alerts', KioskAlertController::class)->middleware('permission:device.manage')->name('pos.kiosk-alerts');
    Route::post('orders/{order}/return-stock', OrderStockReturnController::class)->middleware('permission:order.void|payment.refund')->name('orders.return-stock');
});