<?php

use App\Http\Controllers\ReportController;
use App\Http\Controllers\ZReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');

    Route::resource('z-reports', ZReportController::class)->only(['index', 'store']);

    Route::post('z-reports/{zReport}/reopen', [ZReportController::class, 'reopen'])->name('z-reports.reopen');
});
