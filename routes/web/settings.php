<?php

use App\Http\Controllers\Api\V1\AlertsController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\Settings\PrinterController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('settings')->group(function () {
    Route::redirect('/', '/settings/profile');

    // Profile (does not require a verified email)
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::middleware('verified')->group(function () {
        // Profile / security / appearance
        Route::delete('profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
        Route::get('security', [SecurityController::class, 'edit'])->middleware(RequirePassword::class)->name('security.edit');
        Route::put('password', [SecurityController::class, 'update'])->middleware('throttle:6,1')->name('user-password.update');
        Route::inertia('appearance', 'settings/appearance')->name('appearance.edit');

        // Roles & permissions
        Route::controller(RoleController::class)->prefix('roles')->name('roles.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{role}', 'update')->name('update');
            Route::delete('{role}', 'destroy')->name('destroy');
        });

        // Receipt printer
        Route::get('printer', [PrinterController::class, 'show'])->name('printer.show');
        Route::put('printer', [PrinterController::class, 'update'])->name('printer.update');
        // NOTE: shadowed by the route of the same name below (see "Printer config for registers").
        // Kept untouched so nothing that calls /settings/api/v1/pos/printer breaks.
        Route::get('api/v1/pos/printer', [PrinterController::class, 'forRegister'])->name('api.v1.pos.printer');

        // Devices: kiosks, registers, kitchen screens (permission:device.manage is enforced in the controller)
        Route::controller(DeviceController::class)->prefix('devices')->name('devices.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{device}', 'update')->name('update');
            Route::post('{device}/pairing-code', 'pairingCode')->name('pairing-code');
            Route::post('{device}/unpair', 'unpair')->name('unpair');
            Route::delete('{device}', 'destroy')->name('destroy');
        });
    });
});

// Printer config for registers: session-authenticated, outside the /settings prefix (/api/v1/pos/printer).
// 'web' is already applied by web.php, so only 'auth' is needed here.
Route::middleware('auth')->get('api/v1/pos/printer', [PrinterController::class, 'forRegister'])->name('api.v1.pos.printer');
