<?php

use App\Http\Controllers\Api\V1\DeviceKdsController;
use App\Http\Controllers\Api\V1\DevicePairingController;
use App\Http\Controllers\Api\V1\KdsController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PosConfigController;
use App\Http\Controllers\Api\V1\PosSessionController;
use App\Http\Controllers\Api\V1\ReadyBoardController;
use App\Http\Controllers\Menu\AvailabilityController;
use Illuminate\Support\Facades\Route;

// Kitchen screens (devices): pair with a code, then use the token. No session, no CSRF.
Route::post('v1/devices/pair', DevicePairingController::class)->middleware('throttle:10,1')->name('api.v1.devices.pair');

Route::prefix('v1/device/kds')->name('api.v1.device.kds.')->middleware('auth:sanctum')->group(function () {
    Route::get('tickets', [DeviceKdsController::class, 'tickets'])->name('tickets');
    Route::post('recall', [DeviceKdsController::class, 'recall'])->name('recall');
    Route::post('tickets/{ticket}/start', [DeviceKdsController::class, 'start'])->name('start');
    Route::post('tickets/{ticket}/bump', [DeviceKdsController::class, 'bumpTicket'])->name('bump-ticket');
    Route::post('items/{item}/bump', [DeviceKdsController::class, 'bumpItem'])->name('bump-item');
});

Route::prefix('v1')->name('api.v1.')->middleware(['web', 'auth'])->group(function () {
    Route::get('menu', [MenuController::class, 'index'])
        ->middleware('permission:menu.view')
        ->name('menu');

    Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
    Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');

    Route::get('pos/config', PosConfigController::class)->name('pos.config');
    Route::get('pos/my-orders', PosSessionController::class)->name('pos.my-orders');
    Route::get('pos/ready-orders', ReadyBoardController::class)->name('pos.ready-orders');

    Route::get('kds/stations', [KdsController::class, 'stations'])->name('kds.stations');
    Route::get('kds/stations/{station}/tickets', [KdsController::class, 'tickets'])->name('kds.tickets');
    Route::post('kds/stations/{station}/recall', [KdsController::class, 'recall'])->name('kds.recall');
    Route::post('kds/tickets/{ticket}/start', [KdsController::class, 'start'])->name('kds.start');
    Route::post('kds/tickets/{ticket}/bump', [KdsController::class, 'bumpTicket'])->name('kds.bump-ticket');
    Route::post('kds/items/{item}/bump', [KdsController::class, 'bumpItem'])->name('kds.bump-item');

    Route::post('orders/preview', [OrderController::class, 'preview'])->name('orders.preview');
    Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
    Route::get('orders/lookup/{number}', [OrderController::class, 'lookup'])->name('orders.lookup');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('orders/{order}/confirm', [OrderController::class, 'confirm'])->name('orders.confirm');
    Route::post('orders/{order}/complete', [OrderController::class, 'complete'])->name('orders.complete');
    Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::post('orders/{order}/void', [OrderController::class, 'void'])->name('orders.void');
    Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->name('orders.payments.store');
});
