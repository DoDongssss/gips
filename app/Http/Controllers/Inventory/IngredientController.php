<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\IngredientRequest;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\Unit;
use App\Support\Qty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class IngredientController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:inventory.view', only: ['index', 'options']),
            new Middleware('permission:inventory.adjust', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $filter = $request->string('filter')->toString(); // low | negative | inactive

        $ingredients = Ingredient::query()
            ->with(['category:id,name', 'baseUnit:id,name,abbreviation', 'purchaseUnit:id,name,abbreviation', 'stockLevel:ingredient_id,quantity'])
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")))
            ->when($request->integer('category'), fn ($q, $id) => $q->where('ingredient_category_id', $id))
            ->when($filter === 'inactive', fn ($q) => $q->where('is_active', false), fn ($q) => $q->where('is_active', true))
            ->when($filter === 'low', fn ($q) => $q->where('reorder_level', '>', 0)
                ->whereHas('stockLevel', fn ($s) => $s->whereColumn('stock_levels.quantity', '<=', 'ingredients.reorder_level')))
            ->when($filter === 'negative', fn ($q) => $q->whereHas('stockLevel', fn ($s) => $s->where('quantity', '<', 0)))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Ingredient $i) => $this->present($i));

        return Inertia::render('inventory/ingredients/index', [
            'ingredients' => $ingredients,
            'categories' => IngredientCategory::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'sort_order']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'abbreviation', 'type']),
            'filters' => ['search' => $search, 'filter' => $filter, 'category' => $request->integer('category') ?: null],
        ]);
    }

    /** Light lists for pickers (recipe editor, purchase orders, waste modal): ingredients and units. */
    public function options(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'ingredients' => Ingredient::query()->with(['baseUnit:id,abbreviation,type', 'purchaseUnit:id,abbreviation', 'stockLevel:ingredient_id,quantity'])
                ->where('is_active', true)->orderBy('name')->get()
                ->map(fn (Ingredient $i) => [
                    'id' => $i->id, 'name' => $i->name,
                    'base_unit_id' => $i->base_unit_id, 'base_unit' => $i->baseUnit?->abbreviation, 'base_unit_type' => $i->baseUnit?->type->value,
                    'purchase_unit_id' => $i->purchase_unit_id,
                    'quantity' => Qty::fmt($i->stockLevel?->quantity ?? 0),
                    'average_cost_cents' => (string) $i->average_cost_cents,
                ])->values(),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'abbreviation', 'type'])->map(fn (Unit $u) => [
                'id' => $u->id, 'name' => $u->name, 'abbreviation' => $u->abbreviation, 'type' => $u->type->value,
            ])->values(),
        ]);
    }

    public function store(IngredientRequest $request): RedirectResponse
    {
        $ingredient = Ingredient::create($request->validated());

        return back()->with('success', "{$ingredient->name} was added.");
    }

    public function update(IngredientRequest $request, Ingredient $ingredient): RedirectResponse
    {
        $data = $request->validated();

        // Changing the base unit would silently change the meaning of every stored quantity.
        if ((int) $data['base_unit_id'] !== $ingredient->base_unit_id && $ingredient->movements()->exists()) {
            throw ValidationException::withMessages(['base_unit_id' => 'The base unit cannot change once the ingredient has stock history.']);
        }

        $ingredient->update($data);

        return back()->with('success', "{$ingredient->name} was updated.");
    }

    /** Ingredients in a recipe cannot be removed; mark them inactive instead. */
    public function destroy(Ingredient $ingredient): RedirectResponse
    {
        $inUse = \App\Models\RecipeItem::query()->where('ingredient_id', $ingredient->id)->exists()
            || \App\Models\ModifierRecipeItem::query()->where('ingredient_id', $ingredient->id)->orWhere('replaces_ingredient_id', $ingredient->id)->exists();

        if ($inUse) {
            throw ValidationException::withMessages(['error' => "{$ingredient->name} is used in a recipe. Mark it inactive instead."]);
        }

        $ingredient->delete();

        return back()->with('success', "{$ingredient->name} was deleted.");
    }

    private function present(Ingredient $i): array
    {
        $qty = Qty::round($i->stockLevel?->quantity ?? 0);

        return [
            'id' => $i->id,
            'name' => $i->name,
            'sku' => $i->sku,
            'category' => $i->category,
            'ingredient_category_id' => $i->ingredient_category_id,
            'base_unit' => $i->baseUnit,
            'base_unit_id' => $i->base_unit_id,
            'purchase_unit' => $i->purchaseUnit,
            'purchase_unit_id' => $i->purchase_unit_id,
            'quantity' => Qty::fmt($qty),
            'reorder_level' => (string) $i->reorder_level,
            'average_cost_cents' => (string) $i->average_cost_cents,
            'is_active' => $i->is_active,
            'is_negative' => $qty < 0,
            'is_low' => (float) $i->reorder_level > 0 && $qty <= (float) $i->reorder_level,
        ];
    }
}
