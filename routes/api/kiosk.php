<?php

use App\Http\Controllers\Api\V1\Kiosk\KioskController;
use App\Http\Controllers\Api\V1\Kiosk\KioskOrderController;
use App\Http\Controllers\Api\V1\Kiosk\KioskSessionController;
use App\Http\Middleware\EnsureKioskDevice;
use Illuminate\Support\Facades\Route;

// Kiosk DEVICE API (Sanctum device token). Loaded from api.php outside the 'api.v1.' group.
// Route names must start with "kiosk.api." (BlockDeviceTokensOutsideKiosk relies on it).
Route::prefix('v1/kiosk')->name('kiosk.api.')->group(function () {
    Route::post('pair', [KioskController::class, 'pair'])->middleware('throttle:10,1')->name('pair');

    Route::middleware('auth:sanctum')->group(function () {
        // Read-only: menu & status
        Route::middleware(EnsureKioskDevice::class.':menu:read')
            ->controller(KioskController::class)
            ->group(function () {
                Route::get('status', 'status')->name('status');
                Route::post('heartbeat', 'heartbeat')->name('heartbeat');
                Route::get('menu', 'menu')->name('menu');
                Route::get('screens', 'screens')->name('screens');
                Route::post('upsell', 'upsell')->name('upsell');
            });

        // Ordering: sessions & orders
        Route::middleware(EnsureKioskDevice::class.':orders:create')->group(function () {
            Route::post('sessions', [KioskSessionController::class, 'start'])->name('sessions.start');
            Route::post('sessions/{uuid}/end', [KioskSessionController::class, 'end'])->whereUuid('uuid')->name('sessions.end');
            Route::post('orders', [KioskOrderController::class, 'store'])->middleware('throttle:30,1')->name('orders.store');
        });
    });
});
