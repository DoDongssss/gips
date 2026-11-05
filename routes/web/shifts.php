<?php

use App\Http\Controllers\Shifts\ShiftController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('shifts/export', [ShiftController::class, 'export'])->name('shifts.export');
    Route::resource('shifts', ShiftController::class)->only(['index', 'show', 'store']);
    Route::post('shifts/{shift}/movements', [ShiftController::class, 'movement'])->name('shifts.movements.store');
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
    Route::post('shifts/{shift}/reopen', [ShiftController::class, 'reopen'])->name('shifts.reopen');
});
