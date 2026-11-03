<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:inventory.view')];
    }

    /** The ledger. Filter by ingredient, type and date; this is the "movement history per ingredient" page. */
    public function index(Request $request): Response
    {
        $ingredientId = $request->integer('ingredient') ?: null;
        $type = $request->string('type')->toString();

        $sortable = ['created_at', 'ingredient', 'type', 'quantity_change', 'unit_cost_cents', 'user'];
        $sort = in_array($request->query('sort'), $sortable, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('inventory/movements/index', [
            // Optional: not sent on the first visit. The page asks for it with the "Load movements" button.
            'movements' => Inertia::optional(fn () => StockMovement::query()
                ->with(['ingredient:id,name,base_unit_id', 'ingredient.baseUnit:id,abbreviation', 'user:id,name'])
                ->when($ingredientId, fn ($q, $id) => $q->where('ingredient_id', $id))
                ->when(StockMovementType::tryFrom($type), fn ($q, $t) => $q->where('type', $t->value))
                ->when($request->date('from'), fn ($q, $d) => $q->where('created_at', '>=', $d->startOfDay()))
                ->when($request->date('to'), fn ($q, $d) => $q->where('created_at', '<=', $d->endOfDay()))
                ->when($sort === 'ingredient', fn ($q) => $q->orderBy(
                    DB::table('ingredients')
                        ->select('name')
                        ->whereColumn('ingredients.id', 'stock_movements.ingredient_id')
                        ->limit(1),
                    $direction,
                ))
                ->when($sort === 'user', fn ($q) => $q->orderBy(
                    DB::table('users')
                        ->select('name')
                        ->whereColumn('users.id', 'stock_movements.user_id')
                        ->limit(1),
                    $direction,
                ))
                ->when(
                    in_array($sort, ['created_at', 'type', 'quantity_change', 'unit_cost_cents'], true),
                    fn ($q) => $q->orderBy($sort, $direction),
                )
                // Newest first unless a column is chosen; also the tie-breaker for every sort.
                ->orderByDesc('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (StockMovement $m) => [
                    'id' => $m->id,
                    'ingredient' => ['id' => $m->ingredient->id, 'name' => $m->ingredient->name],
                    'unit' => $m->ingredient->baseUnit?->abbreviation,
                    'type' => $m->type->value,
                    'quantity_change' => (string) $m->quantity_change,
                    'unit_cost_cents' => $m->unit_cost_cents === null ? null : (string) $m->unit_cost_cents,
                    'reference_type' => $m->reference_type,
                    'reference_id' => $m->reference_id,
                    'user' => $m->user?->name,
                    'notes' => $m->notes,
                    'created_at' => $m->created_at?->toIso8601String(),
                ])
            ),
            'ingredient' => $ingredientId ? Ingredient::withTrashed()->find($ingredientId, ['id', 'name']) : null,
            'types' => array_column(StockMovementType::cases(), 'value'),
            'filters' => [
                'ingredient' => $ingredientId,
                'type' => $type,
                'from' => $request->input('from'),
                'to' => $request->input('to'),
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }
}