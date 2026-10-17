<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\StockCountStatus;
use App\Http\Controllers\Concerns\ReportsDomainErrors;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockCountRequest;
use App\Http\Requests\Inventory\StockCountSaveRequest;
use App\Models\StockCount;
use App\Services\Inventory\StockCountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class StockCountController extends Controller implements HasMiddleware
{
    use ReportsDomainErrors;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:inventory.view', only: ['index']),
            new Middleware('permission:inventory.count', except: ['index']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('inventory/counts/index', [
            'counts' => StockCount::query()->with('startedBy:id,name')->withCount('items')->latest('id')->paginate(15)
                ->through(fn (StockCount $c) => [
                    'id' => $c->id, 'status' => $c->status->value, 'items_count' => $c->items_count,
                    'started_by' => $c->startedBy?->name,
                    'started_at' => $c->started_at?->toIso8601String(), 'completed_at' => $c->completed_at?->toIso8601String(),
                    'notes' => $c->notes,
                ]),
            'open_count_id' => StockCount::query()->where('status', StockCountStatus::InProgress)->value('id'),
        ]);
    }

    public function store(StockCountRequest $request, StockCountService $counts): RedirectResponse
    {
        $data = $request->validated();

        $count = null;

        // attempt() turns a business-rule refusal (a count is already open) into a form error.
        $this->attempt(
            function () use ($counts, $request, $data, &$count) {
                $count = $counts->start($request->user(), $data['ingredient_ids'] ?? null, $data['notes'] ?? null);
            },
            'Stock count started.',
        );

        return redirect()->route('inventory.counts.show', $count)->with('success', 'Stock count started.');
    }

    public function show(StockCount $count): Response
    {
        return Inertia::render('inventory/counts/show', [
            'count' => [
                'id' => $count->id, 'status' => $count->status->value, 'notes' => $count->notes,
                'started_at' => $count->started_at?->toIso8601String(), 'completed_at' => $count->completed_at?->toIso8601String(),
            ],
            'items' => Inertia::optional(fn () => $count->items()->with(['ingredient:id,name,base_unit_id', 'ingredient.baseUnit:id,abbreviation'])->get()
                ->sortBy(fn ($i) => $i->ingredient->name)->values()
                ->map(fn ($i) => [
                    'ingredient_id' => $i->ingredient_id, 'name' => $i->ingredient->name, 'unit' => $i->ingredient->baseUnit?->abbreviation,
                    'expected_quantity' => (string) $i->expected_quantity,
                    'counted_quantity' => $i->counted_quantity === null ? null : (string) $i->counted_quantity,
                    'variance' => $i->variance === null ? null : (string) $i->variance,
                ])),
        ]);
    }

        public function update(StockCountSaveRequest $request, StockCount $count, StockCountService $counts): RedirectResponse
    {
        return $this->attempt(fn () => $counts->saveCounts($count, $request->validated('counted')), 'Counts saved.');
    }

    public function complete(Request $request, StockCount $count, StockCountService $counts): RedirectResponse
    {
        return $this->attempt(fn () => $counts->complete($count, $request->user()), 'Stock count completed. Variances were posted to the ledger.');
    }
}
