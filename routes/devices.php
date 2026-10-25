<?php

use App\Http\Controllers\DeviceController;
use Illuminate\Support\Facades\Route;

// Settings > Devices: kiosks, registers and kitchen screens. Guarded by permission:device.manage in the controller.
// In routes/web.php replace the old `devices` routes (and the old DeviceController import) with:
//     require __DIR__.'/devices.php';
Route::middleware(['auth', 'verified'])->prefix('settings')->group(function () {
    Route::get('devices', [DeviceController::class, 'index'])->name('devices.index');
    Route::post('devices', [DeviceController::class, 'store'])->name('devices.store');
    Route::put('devices/{device}', [DeviceController::class, 'update'])->name('devices.update');
    Route::post('devices/{device}/pairing-code', [DeviceController::class, 'pairingCode'])->name('devices.pairing-code');
    Route::post('devices/{device}/unpair', [DeviceController::class, 'unpair'])->name('devices.unpair');
    Route::delete('devices/{device}', [DeviceController::class, 'destroy'])->name('devices.destroy');
});
