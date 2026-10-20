<?php

use App\Http\Controllers\Kiosk\DeviceController;
use App\Http\Controllers\Kiosk\ScreenController;
use App\Http\Controllers\Kiosk\UpsellRuleController;
use Illuminate\Support\Facades\Route;

// Admin pages. Include from routes/web.php:  require __DIR__.'/kiosk.php';
// Every controller is guarded by permission:device.manage.
Route::middleware(['auth', 'verified'])->prefix('kiosk')->name('kiosk.')->group(function () {
    Route::get('devices', [DeviceController::class, 'index'])->name('devices.index');
    Route::post('devices', [DeviceController::class, 'store'])->name('devices.store');
    Route::put('devices/{device}', [DeviceController::class, 'update'])->name('devices.update');
    Route::post('devices/{device}/pairing-code', [DeviceController::class, 'pairingCode'])->name('devices.pairing-code');
    Route::post('devices/{device}/unpair', [DeviceController::class, 'unpair'])->name('devices.unpair');
    Route::delete('devices/{device}', [DeviceController::class, 'destroy'])->name('devices.destroy');

    Route::get('screens', [ScreenController::class, 'index'])->name('screens.index');
    Route::post('screens', [ScreenController::class, 'store'])->name('screens.store');
    // The page posts a multipart form with _method=put (a browser cannot send a file with PUT).
    Route::put('screens/{screen}', [ScreenController::class, 'update'])->name('screens.update');
    Route::delete('screens/{screen}', [ScreenController::class, 'destroy'])->name('screens.destroy');

    Route::get('upsell', [UpsellRuleController::class, 'index'])->name('upsell.index');
    Route::post('upsell', [UpsellRuleController::class, 'store'])->name('upsell.store');
    Route::put('upsell/{rule}', [UpsellRuleController::class, 'update'])->name('upsell.update');
    Route::delete('upsell/{rule}', [UpsellRuleController::class, 'destroy'])->name('upsell.destroy');
});
