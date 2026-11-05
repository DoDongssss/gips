<?php

use App\Http\Controllers\Customers\CustomerController as StoreCustomerController;
use App\Http\Controllers\Settings\ConfigurationController;
use App\Http\Controllers\Settings\StationController;
use App\Http\Controllers\Settings\TaxController;
use App\Http\Controllers\Users\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Users
    Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
    Route::get('customers', [StoreCustomerController::class, 'index'])->name('customers.index');
    Route::get('customers/{customer}', [StoreCustomerController::class, 'show'])->name('customers.show');
    Route::patch('customers/{customer}', [StoreCustomerController::class, 'update'])->name('customers.update');
    Route::post('customers/{customer}/loyalty-adjustment', [StoreCustomerController::class, 'adjustLoyalty'])->name('customers.adjust-loyalty');
    Route::post('users/{user}/reset-credentials', [UserController::class, 'resetCredentials'])->name('users.reset-credentials');

    // System configuration, taxes, kitchen stations
    Route::resource('configurations', ConfigurationController::class)
        ->only(['index', 'update'])
        ->parameters(['configurations' => 'group']);
    Route::resource('taxes', TaxController::class)->only(['index', 'store', 'update']);
    Route::resource('stations', StationController::class)->only(['index', 'store', 'update']);
});
