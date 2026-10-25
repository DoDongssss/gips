<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes (loader)
|--------------------------------------------------------------------------
| One file per feature in routes/api/. Files loaded inside the groups below
| inherit their prefix / name / middleware, so they must not repeat them.
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    // Device-facing: pairing (public, throttled) + Sanctum-token KDS.
    require __DIR__.'/api/devices.php';

    // Staff-facing endpoints used by the POS / back-office (session auth).
    Route::middleware(['web', 'auth'])->group(function () {
        foreach (['menu', 'pos', 'kds', 'orders', 'reports'] as $module) {
            require __DIR__."/api/{$module}.php";
        }
    });
});

// Kiosk: intentionally OUTSIDE the "api.v1." name prefix (route names are relied upon elsewhere).
require __DIR__.'/api/kiosk.php';      // kiosk device API  -> names: kiosk.api.*
require __DIR__.'/api/pos-kiosk.php';  // POS-side kiosk    -> names: pos.*, orders.return-stock
