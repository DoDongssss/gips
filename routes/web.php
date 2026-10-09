<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    
    // users route
    Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
    Route::post('users/{user}/reset-credentials', [UserController::class, 'resetCredentials'])
        ->name('users.reset-credentials');
});

require __DIR__.'/settings.php';
