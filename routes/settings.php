<?php

use App\Http\Controllers\Settings\PrinterController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('settings')->group(function () {
    Route::redirect('/', '/settings/profile');

    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::middleware('verified')->group(function () {
        Route::delete('profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
        Route::get('security', [SecurityController::class, 'edit'])->middleware(RequirePassword::class)->name('security.edit');
        Route::put('password', [SecurityController::class, 'update'])->middleware('throttle:6,1')->name('user-password.update');
        Route::inertia('appearance', 'settings/appearance')->name('appearance.edit');

        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

        Route::get('printer', [PrinterController::class, 'show'])->name('printer.show');
        Route::put('printer', [PrinterController::class, 'update'])->name('printer.update');
        Route::get('api/v1/pos/printer', [PrinterController::class, 'forRegister'])->name('api.v1.pos.printer');
    });
});

Route::middleware(['web', 'auth'])->group(function () {
        Route::get('api/v1/pos/printer', [PrinterController::class, 'forRegister'])->name('api.v1.pos.printer');
});