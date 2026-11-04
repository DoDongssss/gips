<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\DiscountRequest;
use App\Models\Discount;
use App\Services\Discounts\DiscountIndexQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** Discount definitions. Discounts are switched off, not deleted, so old orders keep their link. */
class DiscountController extends Controller implements HasMiddleware
{
    private const PER_PAGE = 15;

    public static function middleware(): array
    {
        return [new Middleware('permission:discount.manage')];
    }

    public function index(Request $request, DiscountIndexQuery $queryBuilder): Response
    {
        $filters = $queryBuilder->filters($request);

        return Inertia::render('discounts/index', [
            'discounts' => Inertia::optional(function () use ($queryBuilder, $filters) {
                $query = $queryBuilder->sorted($queryBuilder->baseQuery($filters), $filters);

                return $query
                    ->paginate(self::PER_PAGE)
                    ->withQueryString()
                    ->through(fn (Discount $d) => [
                        'id' => $d->id,
                        'name' => $d->name,
                        'code' => $d->code,
                        'type' => $d->type->value,
                        'value' => $d->value,
                        'applies_to' => $d->applies_to->value,
                        'requires_id' => $d->requires_id,
                        'requires_approval' => $d->requires_approval,
                        'is_vat_exempt' => $d->is_vat_exempt,
                        'is_active' => $d->is_active,
                        'starts_at' => $d->starts_at?->toIso8601String(),
                        'ends_at' => $d->ends_at?->toIso8601String(),
                    ]);
            }),
            'filters' => [
                'search' => $filters['search'],
                'status' => $filters['status'],
                'type' => $filters['type'],
                'applies_to' => $filters['applies_to'],
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
            ],
        ]);
    }

    public function store(DiscountRequest $request): RedirectResponse
    {
        $discount = Discount::create($request->validated());

        return back()->with('success', "Discount \"{$discount->name}\" created.");
    }

    public function update(DiscountRequest $request, Discount $discount): RedirectResponse
    {
        $discount->update($request->validated());

        return back()->with('success', "Discount \"{$discount->name}\" saved.");
    }
}
