<?php

namespace App\Http\Controllers;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** The cashier's register. The page loads its menu and totals from /api/v1. */
class PosController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:order.create')];
    }

    public function __invoke(): Response
    {
        return Inertia::render('pos/index');
    }
}
