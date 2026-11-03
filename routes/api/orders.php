<?php

use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RefundController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.', middleware web + auth
// Order matters: the static 'preview' and 'lookup/{number}' routes must stay above '{order}'.

Route::controller(OrderController::class)->prefix('orders')->name('orders.')->group(function () {
    Route::post('preview', 'preview')->name('preview');
    Route::post('/', 'store')->name('store');
    Route::get('lookup/{number}', 'lookup')->name('lookup');
    Route::get('{order}', 'show')->name('show');
    Route::post('{order}/confirm', 'confirm')->name('confirm');
    Route::post('{order}/complete', 'complete')->name('complete');
    Route::post('{order}/cancel', 'cancel')->name('cancel');
    Route::post('{order}/void', 'void')->name('void');
});

Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->name('orders.payments.store');
Route::post('orders/{order}/refunds', [RefundController::class, 'store'])->name('orders.refunds.store');
