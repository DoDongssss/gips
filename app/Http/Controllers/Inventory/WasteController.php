<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\WasteReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\WasteRequest;
use App\Models\Ingredient;
use App\Models\WasteLog;
use App\Services\Inventory\WasteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WasteController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        // Anyone who can adjust stock can log waste; viewing the log needs inventory.view.
        return [
            new Middleware('permission:inventory.view', only: ['index']),
            new Middleware('permission:inventory.adjust', only: ['store']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $ingredientId = $request->integer('ingredient') ?: null;
        $reason = $request->string('reason')->toString();

        $sortable = ['created_at', 'ingredient', 'quantity', 'reason', 'user'];
        $sort = in_array($request->query('sort'), $sortable, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('inventory/waste/index', [
            // Optional: not sent on the first visit. The page asks for it with the "Load waste log" button.
            'logs' => Inertia::optional(fn () => WasteLog::query()
                ->with(['ingredient:id,name,base_unit_id', 'ingredient.baseUnit:id,abbreviation', 'user:id,name'])
                ->when($ingredientId, fn ($q, $id) => $q->where('ingredient_id', $id))
                ->when(WasteReason::tryFrom($reason), fn ($q, $r) => $q->where('reason', $r->value))
                ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                    ->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('ingredient', fn ($i) => $i->where('name', 'like', "%{$search}%"))))
                ->when($sort === 'ingredient', fn ($q) => $q->orderBy(
                    DB::table('ingredients')
                        ->select('name')
                        ->whereColumn('ingredients.id', 'waste_logs.ingredient_id')
                        ->limit(1),
                    $direction,
                ))
                ->when($sort === 'user', fn ($q) => $q->orderBy(
                    DB::table('users')
                        ->select('name')
                        ->whereColumn('users.id', 'waste_logs.user_id')
                        ->limit(1),
                    $direction,
                ))
                ->when(
                    in_array($sort, ['created_at', 'quantity', 'reason'], true),
                    fn ($q) => $q->orderBy($sort, $direction),
                )
                ->orderByDesc('id')
                ->paginate(20)
                ->withQueryString()
                ->through(fn (WasteLog $w) => [
                    'id' => $w->id,
                    'ingredient' => ['id' => $w->ingredient->id, 'name' => $w->ingredient->name],
                    'unit' => $w->ingredient->baseUnit?->abbreviation,
                    'quantity' => (string) $w->quantity,
                    'reason' => $w->reason->value,
                    'notes' => $w->notes,
                    'user' => $w->user->name,
                    'created_at' => $w->created_at?->toIso8601String(),
                ])
            ),
            'ingredient' => $ingredientId ? Ingredient::withTrashed()->find($ingredientId, ['id', 'name']) : null,
            'reasons' => array_column(WasteReason::cases(), 'value'),
            'filters' => [
                'search' => $search,
                'ingredient' => $ingredientId,
                'reason' => WasteReason::tryFrom($reason)?->value,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function store(WasteRequest $request, WasteService $waste): RedirectResponse
    {
        $data = $request->validated();
        $ingredient = Ingredient::findOrFail($data['ingredient_id']);

        $waste->log($ingredient, $data['quantity'], WasteReason::from($data['reason']), $request->user(), $data['notes'] ?? null, $data['unit_id'] ?? null);

        return back()->with('success', "Waste logged for {$ingredient->name}.");
    }
}
