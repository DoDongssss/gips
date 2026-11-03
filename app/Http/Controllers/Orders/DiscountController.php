<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\DiscountRequest;
use App\Models\Discount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Discount definitions. Discounts are switched off, not deleted, so old orders keep their link. */
class DiscountController extends Controller implements HasMiddleware
{
    /** Column names a client may sort by. Anything else is ignored. */
    private const SORTABLE = ['name', 'code', 'value', 'is_active'];

    private const PER_PAGE = 15;

    public static function middleware(): array
    {
        return [new Middleware('permission:discount.manage')];
    }

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $sort = $filters['sort'] ?? null;
        $direction = ($filters['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('discounts/index', [
            // Not loaded on the first visit: the page asks for it with a partial reload.
            'discounts' => Inertia::optional(fn () => Discount::query()
                ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(
                    fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%")
                ))
                ->when($sort, fn ($q) => $q->orderBy($sort, $direction)->orderBy('id'), fn ($q) => $q->orderByDesc('is_active')->orderBy('name'))
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
                ])),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
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
