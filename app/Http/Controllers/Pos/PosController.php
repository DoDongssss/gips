<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Services\Shifts\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

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

        if ($shifts->isRequired() && ! $shifts->current($user)) {
            if ($user->can('shift.open')) {
                return redirect()->route('shifts.index')->with('error', 'Open your shift to start taking orders.');
            }

            abort(403, 'No shift is open. Ask a manager to open a shift before using the register.');
        }

        return Inertia::render('pos/index');
    }
}
