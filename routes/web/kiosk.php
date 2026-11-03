<?php

use App\Http\Controllers\Kiosk\ScreenController;
use App\Http\Controllers\Kiosk\UpsellRuleController;
use Illuminate\Support\Facades\Route;

// Kiosk back-office: attract screens and upsell rules. (The kiosk device API is routes/api/kiosk.php.)
Route::middleware(['auth', 'verified'])->prefix('kiosk')->name('kiosk.')->group(function () {
    // The page posts a multipart form with _method=put (a browser cannot send a file with PUT).
    Route::controller(ScreenController::class)->prefix('screens')->name('screens.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('{screen}', 'update')->name('update');
        Route::delete('{screen}', 'destroy')->name('destroy');
    });

    Route::controller(UpsellRuleController::class)->prefix('upsell')->name('upsell.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('{rule}', 'update')->name('update');
        Route::delete('{rule}', 'destroy')->name('destroy');
    });
});
