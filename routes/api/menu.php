<?php

use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Menu\AvailabilityController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.', middleware web + auth

Route::get('menu', [MenuController::class, 'index'])->middleware('permission:menu.view')->name('menu');

Route::patch('products/{product}/availability', [AvailabilityController::class, 'product'])->name('products.availability');
Route::patch('modifiers/{modifier}/availability', [AvailabilityController::class, 'modifier'])->name('modifiers.availability');
