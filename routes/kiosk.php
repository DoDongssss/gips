<?php

use App\Http\Controllers\Kiosk\ScreenController;
use App\Http\Controllers\Kiosk\UpsellRuleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('kiosk')->name('kiosk.')->group(function () {
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
