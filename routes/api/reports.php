<?php

use App\Http\Controllers\Api\V1\XReportController;
use Illuminate\Support\Facades\Route;

// Loaded inside: prefix 'v1', name 'api.v1.', middleware web + auth

Route::post('reports/x', XReportController::class)->middleware('permission:report.view|shift.close')->name('reports.x');
