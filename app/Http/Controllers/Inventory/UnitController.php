<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\UnitType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\UnitRequest;
use App\Models\Ingredient;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Services\Inventory\UnitConverter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:inventory.view', only: ['index']),
            new Middleware('permission:inventory.adjust', except: ['index']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $type = $request->string('type')->toString();
        $convSearch = $request->string('conv_search')->toString();

        $sortable = ['name', 'abbreviation', 'type'];
        $sort = in_array($request->query('sort'), $sortable, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $convSortable = ['from', 'to', 'factor'];
        $convSort = in_array($request->query('conv_sort'), $convSortable, true) ? $request->query('conv_sort') : null;
        $convDirection = $request->query('conv_direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('inventory/units/index', [
            // Optional: not sent on the first visit. The page asks for it with "Load units & conversions".
            'units' => Inertia::optional(fn () => Unit::query()
                ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('abbreviation', 'like', "%{$search}%")))
                ->when(UnitType::tryFrom($type), fn ($q, $t) => $q->where('type', $t->value))
                ->when(
                    in_array($sort, ['name', 'abbreviation', 'type'], true),
                    fn ($q) => $q->orderBy($sort, $direction),
                )
                ->when($sort !== 'name', fn ($q) => $q->orderBy('name'))
                ->orderBy('id')
                ->paginate(20, ['*'], 'units_page')
                ->withQueryString()
                ->through(fn (Unit $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'abbreviation' => $u->abbreviation,
                    'type' => $u->type->value,
                ])
            ),
            'conversions' => Inertia::optional(fn () => UnitConversion::query()
                ->with(['from:id,name,abbreviation', 'to:id,name,abbreviation'])
                ->when($convSearch !== '', fn ($q) => $q->where(fn ($w) => $w
                    ->whereHas('from', fn ($u) => $u->where('name', 'like', "%{$convSearch}%")->orWhere('abbreviation', 'like', "%{$convSearch}%"))
                    ->orWhereHas('to', fn ($u) => $u->where('name', 'like', "%{$convSearch}%")->orWhere('abbreviation', 'like', "%{$convSearch}%"))))
                ->when($convSort === 'from', fn ($q) => $q->orderBy(
                    DB::table('units')
                        ->select('name')
                        ->whereColumn('units.id', 'unit_conversions.from_unit_id')
                        ->limit(1),
                    $convDirection,
                ))
                ->when($convSort === 'to', fn ($q) => $q->orderBy(
                    DB::table('units')
                        ->select('name')
                        ->whereColumn('units.id', 'unit_conversions.to_unit_id')
                        ->limit(1),
                    $convDirection,
                ))
                ->when($convSort === 'factor', fn ($q) => $q->orderBy('factor', $convDirection))
                ->orderBy('id')
                ->get()
                ->map(fn (UnitConversion $c) => [
                    'id' => $c->id,
                    'from' => $c->from,
                    'to' => $c->to,
                    'factor' => (string) $c->factor,
                ])
                ->values()
            ),
            // Full list for conversion pickers (not the paginated units table).
            'unitPicker' => Inertia::optional(fn () => Unit::query()->orderBy('type')->orderBy('name')->get(['id', 'name', 'abbreviation', 'type'])
                ->map(fn (Unit $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'abbreviation' => $u->abbreviation,
                    'type' => $u->type->value,
                ])
                ->values()
            ),
            'types' => array_column(UnitType::cases(), 'value'),
            'filters' => [
                'search' => $search,
                'type' => UnitType::tryFrom($type)?->value,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
                'conv_search' => $convSearch,
                'conv_sort' => $convSort,
                'conv_direction' => $convSort ? $convDirection : null,
            ],
        ]);
    }

    public function store(UnitRequest $request): RedirectResponse
    {
        $data = $request->validated();

        Unit::create($data);

        return back()->with('success', "{$data['name']} was added.");
    }

    public function update(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        return back()->with('success', "{$unit->name} was updated.");
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        if (Ingredient::withTrashed()->where('base_unit_id', $unit->id)->orWhere('purchase_unit_id', $unit->id)->exists()) {
            throw ValidationException::withMessages(['error' => "{$unit->name} is used by an ingredient, so it cannot be deleted."]);
        }

        UnitConversion::query()->where('from_unit_id', $unit->id)->orWhere('to_unit_id', $unit->id)->delete();
        $unit->delete();
        app(UnitConverter::class)->flush();

        return back()->with('success', "{$unit->name} was deleted.");
    }
}
