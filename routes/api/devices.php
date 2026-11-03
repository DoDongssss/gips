<?php

use App\Http\Controllers\Api\V1\DeviceAlertController;
use App\Http\Controllers\Api\V1\DeviceKdsController;
use App\Http\Controllers\Api\V1\DevicePairingController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.'

Route::post('devices/pair', DevicePairingController::class)->middleware('throttle:10,1')->name('devices.pair');

// Kitchen display paired as a device (Sanctum token)
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
    // Route::get('device/alerts', DeviceAlertController::class)->middleware('permission:device.manage')->name('device.alerts');
});