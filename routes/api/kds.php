<?php

use App\Http\Controllers\Api\V1\KdsController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.', middleware web + auth
// (Device-token KDS lives in api/devices.php.)

Route::controller(KdsController::class)->prefix('kds')->name('kds.')->group(function () {
    Route::get('stations', 'stations')->name('stations');
    Route::get('stations/{station}/tickets', 'tickets')->name('tickets');
    Route::post('stations/{station}/recall', 'recall')->name('recall');
    Route::post('tickets/{ticket}/start', 'start')->name('start');
    Route::post('tickets/{ticket}/bump', 'bumpTicket')->name('bump-ticket');
    Route::post('items/{item}/bump', 'bumpItem')->name('bump-item');
});
