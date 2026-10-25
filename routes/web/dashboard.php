<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
});
