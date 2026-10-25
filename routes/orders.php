<?php

use App\Http\Controllers\Orders\DiscountController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('pos', PosController::class)->name('pos.index');

    Route::resource('orders', OrderController::class)->only(['index', 'show']);
    Route::post('orders/{order}/receipts/{receipt}/reprint', [OrderController::class, 'reprint'])->name('orders.receipts.reprint');

    Route::resource('discounts', DiscountController::class)->only(['index', 'store', 'update']);
});