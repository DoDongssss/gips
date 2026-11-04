<?php

namespace App\Http\Controllers;

use App\Enums\CashMovementType;
use App\Enums\ShiftStatus;
use App\Http\Requests\ShiftRequest;
use App\Models\Shift;
use App\Models\User;
use App\Services\Shifts\ShiftIndexQuery;
use App\Services\Shifts\ShiftPresenter;
use App\Services\Shifts\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** The cashier's cash session: open it, move cash in and out, count and close. */
class ShiftController extends Controller implements HasMiddleware
{
    public function __construct(
        private ShiftService $shifts,
        private ShiftIndexQuery $indexQuery,
        private ShiftPresenter $presenter,
    ) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:shift.open|shift.close|shift.view-all', only: ['index', 'show', 'export']),
            new Middleware('permission:shift.open', only: ['store', 'movement']),
            new Middleware('permission:shift.close', only: ['close']),
            new Middleware('permission:shift.reopen', only: ['reopen']),
        ];
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $viewAll = $user->can('shift.view-all');
        $filters = $this->indexQuery->filters($request);

        $current = $this->shifts->current($user);
        if ($current) {
            $current->load(['movements.user:id,name', 'user:id,name']);
        }

        $openShifts = Shift::query()
            ->with(['movements.user:id,name', 'user:id,name'])
            ->where('status', ShiftStatus::Open)
            ->when(! $viewAll, fn ($q) => $q->where('user_id', $user->id))
            ->orderBy('opened_at')
            ->get();

        return Inertia::render('shifts/index', [
            'current' => $current ? $this->presenter->present($current, $user, $viewAll) : null,
            'open_shifts' => $viewAll
                ? $openShifts->map(fn (Shift $shift) => $this->presenter->present($shift, $user, true))->values()
                : [],
            'require_shift' => $this->shifts->isRequired(),
            'can_view_all' => $viewAll,
            'cashiers' => $viewAll ? $this->indexQuery->cashierOptions(true)->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
            ])->values() : [],

            'history' => Inertia::optional(function () use ($filters, $user, $viewAll) {
                $builder = $this->indexQuery->sorted(
                    $this->indexQuery->historyQuery($filters, $user, $viewAll),
                    $filters,
                );

                return $builder
                    ->paginate(ShiftIndexQuery::PER_PAGE)
                    ->withQueryString()
                    ->through(fn (Shift $shift) => $this->presenter->present($shift, $user, true));
            }),

            'filters' => $filters,
        ]);
    }

    public function show(Request $request, Shift $shift): Response
    {
        $user = $request->user();
        $viewAll = $user->can('shift.view-all');

        abort_unless($shift->user_id === $user->id || $viewAll, 403);

        $shift->load(['movements.user:id,name', 'user:id,name']);

        return Inertia::render('shifts/show', [
            'shift' => $this->presenter->present($shift, $user, $viewAll),
            'can_view_all' => $viewAll,
            'can_close' => $user->can('shift.close') && ($shift->isOpen() && ($shift->user_id === $user->id || $viewAll)),
            'can_move' => $user->can('shift.open') && $shift->isOpen() && ($shift->user_id === $user->id || $viewAll),
            'can_reopen' => $user->can('shift.reopen') && ! $shift->isOpen(),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $viewAll = $user->can('shift.view-all');
        abort_unless($user->can('report.export') || $viewAll, 403);

        $filters = $this->indexQuery->filters($request);
        $rows = $this->indexQuery->sorted(
            $this->indexQuery->historyQuery($filters, $user, $viewAll),
            $filters,
        )->with('user:id,name')->limit(5000)->get();

        $filename = 'shifts-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Business date', 'Cashier', 'Opened', 'Closed', 'Opening', 'Expected', 'Counted', 'Variance', 'Notes']);

            foreach ($rows as $shift) {
                fputcsv($out, [
                    $shift->business_date->toDateString(),
                    $shift->user?->name ?? '',
                    $shift->opened_at?->toDateTimeString() ?? '',
                    $shift->closed_at?->toDateTimeString() ?? '',
                    number_format($shift->opening_cash_cents / 100, 2, '.', ''),
                    $shift->expected_cash_cents === null ? '' : number_format($shift->expected_cash_cents / 100, 2, '.', ''),
                    $shift->counted_cash_cents === null ? '' : number_format($shift->counted_cash_cents / 100, 2, '.', ''),
                    $shift->variance_cents === null ? '' : number_format($shift->variance_cents / 100, 2, '.', ''),
                    $shift->notes ?? '',
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function store(ShiftRequest $request): RedirectResponse
    {
        $deviceId = $request->validated('device_id');

        $this->shifts->open(
            $request->user(),
            $request->validated('opening_cash_cents'),
            $deviceId ? (int) $deviceId : null,
        );

        return back()->with('success', 'Shift opened. You can start taking orders.');
    }

    public function movement(ShiftRequest $request, Shift $shift): RedirectResponse
    {
        $this->authorizeOwner($request, $shift);

        $type = CashMovementType::from($request->validated('type'));
        $this->shifts->addMovement(
            $shift,
            $request->user(),
            $type,
            $request->validated('amount_cents'),
            $request->validated('reason'),
        );

        return back()->with('success', "{$type->label()} recorded.");
    }

    public function close(ShiftRequest $request, Shift $shift): RedirectResponse
    {
        $this->authorizeOwner($request, $shift);

        $closed = $this->shifts->close(
            $shift,
            $request->user(),
            $request->validated('counted_cash_cents'),
            $request->validated('notes'),
        );

        $variance = $closed->variance_cents;
        $message = $variance === 0
            ? 'Shift closed. The drawer matches exactly.'
            : 'Shift closed. The drawer is '.($variance > 0 ? 'over' : 'short').' by ₱'.number_format(abs($variance) / 100, 2).'.';

        return back()->with('success', $message);
    }

    public function reopen(Request $request, Shift $shift): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        $this->shifts->reopen($shift, $request->user(), $data['reason']);

        return back()->with('success', 'Shift reopened. The cashier can continue and close it again.');
    }

    private function authorizeOwner(Request $request, Shift $shift): void
    {
        abort_unless($shift->user_id === $request->user()->id || $request->user()->can('shift.view-all'), 403);
    }
}
