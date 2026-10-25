<?php

use App\Http\Controllers\ConfigurationController;
use App\Http\Controllers\StationController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Users
    Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
    Route::post('users/{user}/reset-credentials', [UserController::class, 'resetCredentials'])->name('users.reset-credentials');

    // System configuration, taxes, kitchen stations
    Route::resource('configurations', ConfigurationController::class)
        ->only(['index', 'update'])
        ->parameters(['configurations' => 'group']);
    Route::resource('taxes', TaxController::class)->only(['index', 'store', 'update']);
    Route::resource('stations', StationController::class)->only(['index', 'store', 'update']);
});
