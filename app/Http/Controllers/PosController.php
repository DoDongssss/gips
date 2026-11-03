<?php

namespace App\Http\Controllers;

use App\Services\Shifts\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    /** With "require an open shift" on, a cashier without one is sent to open it first. */
    public function __invoke(Request $request, ShiftService $shifts): Response|RedirectResponse
    {
        $user = $request->user();

        if ($shifts->isRequired() && ! $shifts->current($user) && $user->can('shift.open')) {
            return redirect()->route('shifts.index')->with('error', 'Open your shift to start taking orders.');
        }

        return Inertia::render('pos/index');
    }
}
