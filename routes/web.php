<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    
    Route::middleware('permission:user.view')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
    });
    
    Route::post('users', [UserController::class, 'store'])
        ->middleware('permission:user.create')
        ->name('users.store');
});

require __DIR__.'/settings.php';
