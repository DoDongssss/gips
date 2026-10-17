<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\UnitType;
use App\Http\Requests\Inventory\UnitRequest;
use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Services\Inventory\UnitConverter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
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

    public function index(): Response
    {
        return Inertia::render('inventory/units/index', [
            'units' => Unit::query()->orderBy('type')->orderBy('name')->get(),
            'conversions' => UnitConversion::query()->with(['from:id,name,abbreviation', 'to:id,name,abbreviation'])->get()
                ->map(fn ($c) => ['id' => $c->id, 'from' => $c->from, 'to' => $c->to, 'factor' => $c->factor]),
            'types' => array_column(UnitType::cases(), 'value'),
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
