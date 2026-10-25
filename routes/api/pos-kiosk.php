<?php

use App\Http\Controllers\Api\V1\KioskAlertController;
use App\Http\Controllers\Api\V1\OrderEditController;
use App\Http\Controllers\Api\V1\OrderStockReturnController;
use App\Http\Controllers\Api\V1\PosKioskOrdersController;
use Illuminate\Support\Facades\Route;

// POS-side endpoints for kiosk orders (session auth). Names are intentionally NOT prefixed with
// 'api.v1.' (pos.kiosk-orders, pos.orders.cart, orders.return-stock, ...) — changing them breaks callers.
Route::middleware(['web', 'auth'])->prefix('v1')->group(function () {
    Route::middleware('permission:order.create')->group(function () {
        Route::get('pos/kiosk-orders', PosKioskOrdersController::class)->name('pos.kiosk-orders');
        Route::get('pos/orders/{order}/cart', [OrderEditController::class, 'cart'])->name('pos.orders.cart');
        Route::post('pos/orders/{order}/update', [OrderEditController::class, 'update'])->name('pos.orders.update');
    });

    Route::get('pos/kiosk-alerts', KioskAlertController::class)->middleware('permission:device.manage')->name('pos.kiosk-alerts');
    Route::post('orders/{order}/return-stock', OrderStockReturnController::class)->middleware('permission:order.void|payment.refund')->name('orders.return-stock');
});
