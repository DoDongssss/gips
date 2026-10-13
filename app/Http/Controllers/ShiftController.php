<?php

namespace App\Http\Controllers;

use App\Enums\CashMovementType;
use App\Http\Requests\ShiftRequest;
use App\Models\Shift;
use App\Services\Shifts\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** The cashier's cash session: open it, move cash in and out, count and close. */
class ShiftController extends Controller implements HasMiddleware
{
    private const HISTORY = 30;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:shift.open|shift.close|shift.view-all', only: ['index']),
            new Middleware('permission:shift.open', only: ['store', 'movement']),
            new Middleware('permission:shift.close', only: ['close']),
        ];
    }

    public function index(Request $request, ShiftService $shifts): Response
    {
        $user = $request->user();
        $viewAll = $user->can('shift.view-all');
        $current = $shifts->current($user);

        return Inertia::render('shifts/index', [
            'current' => $current ? $this->present($current->load('movements.user:id,name', 'user:id,name'), $shifts, $viewAll) : null,
            'require_shift' => $shifts->isRequired(),
            'can_view_all' => $viewAll,
            'history' => Shift::query()->with('user:id,name')
                ->where('status', 'closed')
                ->when(! $viewAll, fn ($q) => $q->where('user_id', $user->id))
                ->latest('id')->limit(self::HISTORY)->get()
                ->map(fn (Shift $shift) => $this->present($shift, $shifts, true))->values(),
        ]);
    }

    public function store(ShiftRequest $request, ShiftService $shifts): RedirectResponse
    {
        $shifts->open($request->user(), $request->validated('opening_cash_cents'));

        return back()->with('success', 'Shift opened. You can start taking orders.');
    }

    public function movement(ShiftRequest $request, Shift $shift, ShiftService $shifts): RedirectResponse
    {
        $this->authorizeOwner($request, $shift);

        $type = CashMovementType::from($request->validated('type'));
        $shifts->addMovement($shift, $request->user(), $type, $request->validated('amount_cents'), $request->validated('reason'));

        return back()->with('success', "{$type->label()} recorded.");
    }

    public function close(ShiftRequest $request, Shift $shift, ShiftService $shifts): RedirectResponse
    {
        $this->authorizeOwner($request, $shift);

        $closed = $shifts->close($shift, $request->user(), $request->validated('counted_cash_cents'), $request->validated('notes'));

        $variance = $closed->variance_cents;
        $message = $variance === 0
            ? 'Shift closed. The drawer matches exactly.'
            : 'Shift closed. The drawer is '.($variance > 0 ? 'over' : 'short').' by ₱'.number_format(abs($variance) / 100, 2).'.';

        return back()->with('success', $message);
    }

    /** Only the person who opened a shift (or someone who may view all shifts) can work on it. */
    private function authorizeOwner(Request $request, Shift $shift): void
    {
        abort_unless($shift->user_id === $request->user()->id || $request->user()->can('shift.view-all'), 403);
    }

    /**
     * What the drawer should hold is shown to people who may view all shifts, or after the shift is closed.
     * A cashier counts the drawer blind so the count is honest.
     *
     * @return array<string, mixed>
     */
    private function present(Shift $shift, ShiftService $shifts, bool $showExpected): array
    {
        $isOpen = $shift->isOpen();

        return [
            'id' => $shift->id,
            'cashier' => $shift->user?->name,
            'status' => $shift->status->value,
            'business_date' => $shift->business_date->toDateString(),
            'opened_at' => $shift->opened_at->toIso8601String(),
            'closed_at' => $shift->closed_at?->toIso8601String(),
            'opening_cash_cents' => $shift->opening_cash_cents,
            'expected_cash_cents' => $isOpen ? ($showExpected ? $shifts->expectedCashCents($shift) : null) : $shift->expected_cash_cents,
            'counted_cash_cents' => $shift->counted_cash_cents,
            'variance_cents' => $shift->variance_cents,
            'notes' => $shift->notes,
            'cash' => $isOpen && $showExpected ? $shifts->cashBreakdown($shift) : null,
            'movements' => $shift->relationLoaded('movements') ? $shift->movements->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type->value,
                'label' => $m->type->label(),
                'amount_cents' => $m->amount_cents,
                'reason' => $m->reason,
                'by' => $m->user?->name,
                'at' => $m->created_at?->toIso8601String(),
            ])->values() : [],
        ];
    }
}
