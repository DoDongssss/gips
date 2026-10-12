<?php

use App\Http\Controllers\Orders\DiscountController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('pos', PosController::class)->name('pos.index');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('orders/{order}/receipts/{receipt}/reprint', [OrderController::class, 'reprint'])->name('orders.receipts.reprint');

    Route::get('discounts', [DiscountController::class, 'index'])->name('discounts.index');
    Route::post('discounts', [DiscountController::class, 'store'])->name('discounts.store');
    Route::put('discounts/{discount}', [DiscountController::class, 'update'])->name('discounts.update');
});

