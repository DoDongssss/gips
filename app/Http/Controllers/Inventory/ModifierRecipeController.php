<?php

namespace App\Http\Controllers\Inventory;

use App\Enums\ModifierAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\ModifierRecipeRequest;
use App\Models\Modifier;
use App\Models\ModifierRecipeItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;

/** What a modifier does to stock: add an ingredient, remove one, or replace one with another. */
class ModifierRecipeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:recipe.manage|inventory.view', only: ['show']),
            new Middleware('permission:recipe.manage', only: ['update']),
        ];
    }

    public function show(Modifier $modifier): JsonResponse
    {
        return response()->json([
            'items' => ModifierRecipeItem::query()->where('modifier_id', $modifier->id)->get()->map(fn ($i) => [
                'ingredient_id' => $i->ingredient_id, 'quantity' => (string) $i->quantity, 'unit_id' => $i->unit_id,
                'action' => $i->action->value, 'replaces_ingredient_id' => $i->replaces_ingredient_id,
            ])->values(),
        ]);
    }

    public function update(ModifierRecipeRequest $request, Modifier $modifier): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($modifier, $data) {
            $modifier->getConnection()->table('modifier_recipe_items')->where('modifier_id', $modifier->id)->delete();

            foreach ($data['items'] as $item) {
                ModifierRecipeItem::create([
                    'modifier_id' => $modifier->id,
                    'ingredient_id' => $item['ingredient_id'],
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'],
                    'action' => $item['action'],
                    // Only a replace rule carries a replaced ingredient.
                    'replaces_ingredient_id' => $item['action'] === ModifierAction::Replace->value ? $item['replaces_ingredient_id'] : null,
                ]);
            }
        });

        return back()->with('success', 'Modifier stock effects saved.');
    }
}
