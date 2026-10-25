<?php

use App\Http\Controllers\Api\V1\DeviceKdsController;
use App\Http\Controllers\Api\V1\DevicePairingController;
use App\Http\Controllers\Api\V1\KdsController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PosConfigController;
use App\Http\Controllers\Api\V1\PosSessionController;
use App\Http\Controllers\Api\V1\PrinterStatusController;
use App\Http\Controllers\Api\V1\ReadyBoardController;
use App\Http\Controllers\Api\V1\RefundController;
use App\Http\Controllers\Api\V1\XReportController;
use App\Http\Controllers\Menu\AvailabilityController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('devices/pair', DevicePairingController::class)->middleware('throttle:10,1')->name('devices.pair');

    Route::middleware('auth:sanctum')
        ->controller(DeviceKdsController::class)
        ->prefix('device/kds')
        ->name('device.kds.')
        ->group(function () {
            Route::get('tickets', 'tickets')->name('tickets');
            Route::post('recall', 'recall')->name('recall');
            Route::post('tickets/{ticket}/start', 'start')->name('start');
            Route::post('tickets/{ticket}/bump', 'bumpTicket')->name('bump-ticket');
            Route::post('items/{item}/bump', 'bumpItem')->name('bump-item');
        });

    Route::middleware(['web', 'auth'])->group(function () {
        Route::get('menu', [MenuController::class, 'index'])->middleware('permission:menu.view')->name('menu');

        Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
        Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');

        Route::prefix('pos')->name('pos.')->group(function () {
            Route::get('config', PosConfigController::class)->name('config');
            Route::get('my-orders', PosSessionController::class)->name('my-orders');
            Route::get('ready-orders', ReadyBoardController::class)->name('ready-orders');
        });

        Route::controller(KdsController::class)->prefix('kds')->name('kds.')->group(function () {
            Route::get('stations', 'stations')->name('stations');
            Route::get('stations/{station}/tickets', 'tickets')->name('tickets');
            Route::post('stations/{station}/recall', 'recall')->name('recall');
            Route::post('tickets/{ticket}/start', 'start')->name('start');
            Route::post('tickets/{ticket}/bump', 'bumpTicket')->name('bump-ticket');
            Route::post('items/{item}/bump', 'bumpItem')->name('bump-item');
        });

        Route::controller(OrderController::class)->prefix('orders')->name('orders.')->group(function () {
            Route::post('preview', 'preview')->name('preview');
            Route::post('/', 'store')->name('store');
            Route::get('lookup/{number}', 'lookup')->name('lookup');
            Route::get('{order}', 'show')->name('show');
            Route::post('{order}/confirm', 'confirm')->name('confirm');
            Route::post('{order}/complete', 'complete')->name('complete');
            Route::post('{order}/cancel', 'cancel')->name('cancel');
            Route::post('{order}/void', 'void')->name('void');
        });
        Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->name('orders.payments.store');
        Route::post('orders/{order}/refunds', [RefundController::class, 'store'])->name('orders.refunds.store');

        Route::post('pos/printer-status', [PrinterStatusController::class, 'report'])->middleware(['permission:order.create', 'throttle:30,1'])->name('pos.printer-status');
        Route::get('pos/printer-alerts', [PrinterStatusController::class, 'alerts'])->middleware('permission:device.manage')->name('pos.printer-alerts');

        // Route::post('reports/x', XReportController::class)->name('reports.x');
        Route::post('reports/x', XReportController::class)->middleware('permission:report.view|shift.close')->name('reports.x');
    });
});

require __DIR__.'/kiosk-api.php';