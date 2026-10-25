<?php

use App\Http\Controllers\ReportController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\ZReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('shifts', ShiftController::class)->only(['index', 'store']);
    Route::post('shifts/{shift}/movements', [ShiftController::class, 'movement'])->name('shifts.movements.store');
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');

    Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');

    Route::resource('z-reports', ZReportController::class)->only(['index', 'store']);
});