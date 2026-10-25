<?php

use App\Http\Controllers\PinLoginController;
use Illuminate\Support\Facades\Route;

// Public Inertia pages (the kiosk and kitchen apps authenticate via device token, not session).
Route::inertia('/', 'welcome')->name('home');
Route::inertia('kiosk', 'kiosk/app')->name('kiosk.app');
Route::inertia('kitchen', 'kitchen/screen')->name('kitchen.screen');

// PIN login (guests only)
Route::middleware('guest')->controller(PinLoginController::class)->group(function () {
    Route::get('pin-login', 'create')->name('pin-login');
    Route::post('pin-login', 'store')->name('pin-login.store');
});
