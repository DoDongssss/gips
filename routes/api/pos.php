<?php

use App\Http\Controllers\Api\V1\PosConfigController;
use App\Http\Controllers\Api\V1\PosSessionController;
use App\Http\Controllers\Api\V1\PrinterStatusController;
use App\Http\Controllers\Api\V1\ReadyBoardController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.', middleware web + auth

Route::prefix('pos')->name('pos.')->group(function () {
    Route::get('config', PosConfigController::class)->name('config');
    Route::get('my-orders', PosSessionController::class)->name('my-orders');
    Route::get('ready-orders', ReadyBoardController::class)->name('ready-orders');

    // Printer health
    Route::post('printer-status', [PrinterStatusController::class, 'report'])->middleware(['permission:order.create', 'throttle:30,1'])->name('printer-status');
    Route::get('printer-alerts', [PrinterStatusController::class, 'alerts'])->middleware('permission:device.manage')->name('printer-alerts');
});
