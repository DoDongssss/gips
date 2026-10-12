<?php

use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Menu\AvailabilityController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->name('api.v1.')->middleware('auth:sanctum')->group(function () {
    Route::get('menu', [MenuController::class, 'index'])
        ->middleware('permission:menu.view')
        ->name('menu');

    // Sold-out toggle for the POS screen
    Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
    Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
});
