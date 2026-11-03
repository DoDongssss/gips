<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\SupplierPriceRequest;
use App\Http\Requests\Inventory\SupplierRequest;
use App\Models\Ingredient;
use App\Models\Supplier;
use App\Models\SupplierIngredient;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:supplier.manage')];
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        return Inertia::render('inventory/suppliers/index', [
            'suppliers' => Supplier::query()->withCount('ingredients')
                ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                ->orderBy('name')->paginate(20)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Supplier $supplier): Response
    {
        return Inertia::render('inventory/suppliers/show', [
            'supplier' => $supplier,
            'prices' => SupplierIngredient::query()->with(['ingredient:id,name', 'unit:id,name,abbreviation'])
                ->where('supplier_id', $supplier->id)->get()
                ->map(fn ($p) => [
                    'id' => $p->id, 'ingredient_id' => $p->ingredient_id, 'ingredient' => $p->ingredient->name,
                    'supplier_sku' => $p->supplier_sku, 'unit_id' => $p->unit_id, 'unit' => $p->unit->abbreviation,
                    'unit_cost_cents' => $p->unit_cost_cents, 'is_preferred' => $p->is_preferred,
                ]),
            'ingredients' => Inertia::optional(fn () => Ingredient::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'purchase_unit_id', 'base_unit_id'])),
            'units' => Inertia::optional(fn () => Unit::query()->orderBy('name')->get(['id', 'name', 'abbreviation'])),
        ]);
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::create($request->validated());

        return back()->with('success', "{$supplier->name} was added.");
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return back()->with('success', "{$supplier->name} was updated.");
    }

    /** A supplier with purchase orders is deactivated by the soft delete, and old orders keep their name. */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return back()->with('success', "{$supplier->name} was removed.");
    }

    /** Add or change the price list entry for one ingredient. */
    public function savePrice(SupplierPriceRequest $request, Supplier $supplier): RedirectResponse
    {
        $data = $request->validated();

        // One preferred supplier per ingredient.
        if ($data['is_preferred']) {
            SupplierIngredient::query()->where('ingredient_id', $data['ingredient_id'])->update(['is_preferred' => false]);
        }

        SupplierIngredient::updateOrCreate(
            ['supplier_id' => $supplier->id, 'ingredient_id' => $data['ingredient_id']],
            collect($data)->except('ingredient_id')->all(),
        );

        return back()->with('success', 'Supplier price saved.');
    }

    public function destroyPrice(Supplier $supplier, SupplierIngredient $price): RedirectResponse
    {
        abort_unless($price->supplier_id === $supplier->id, 404);
        $price->delete();

        return back()->with('success', 'Price removed.');
    }
}
