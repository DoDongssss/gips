<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RecipeRequest;
use App\Models\Product;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;

/** Recipe editor for the product page: one recipe for the product and optionally one per size. */
class RecipeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:recipe.manage|inventory.view', only: ['show']),
            new Middleware('permission:recipe.manage', only: ['update']),
        ];
    }

    public function show(Product $product): JsonResponse
    {
        $recipes = Recipe::query()->with('items')->where('product_id', $product->id)->get()->keyBy(fn ($r) => $r->product_variant_id ?? 0);

        $present = fn (?Recipe $r, ?int $variantId) => [
            'product_variant_id' => $variantId,
            'yield_quantity' => $r ? (string) $r->yield_quantity : '1.00',
            'notes' => $r?->notes,
            'items' => $r?->items->map(fn ($i) => ['ingredient_id' => $i->ingredient_id, 'quantity' => (string) $i->quantity, 'unit_id' => $i->unit_id])->values() ?? [],
        ];

        return response()->json([
            'product' => $present($recipes->get(0), null),
            'variants' => $product->variants()->orderBy('sort_order')->get(['id', 'name'])
                ->map(fn ($v) => ['id' => $v->id, 'name' => $v->name] + $present($recipes->get($v->id), $v->id))->values(),
        ]);
    }

    /** See RecipeRequest for the payload shape. */
    public function update(RecipeRequest $request, Product $product): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $product) {
            foreach ($data['recipes'] as $recipe) {
                $variantId = $recipe['product_variant_id'] ?? null;
                $existing = Recipe::query()->where('product_id', $product->id)->where('product_variant_id', $variantId)->first();

                if (empty($recipe['items'])) {
                    $existing?->delete();

                    continue;
                }

                $model = $existing ?? new Recipe(['product_id' => $product->id, 'product_variant_id' => $variantId]);
                $model->fill(['yield_quantity' => $recipe['yield_quantity'] ?? 1, 'notes' => $recipe['notes'] ?? null])->save();

                $model->items()->delete();
                $model->items()->createMany(collect($recipe['items'])->map(fn ($i) => [
                    'ingredient_id' => $i['ingredient_id'], 'quantity' => $i['quantity'], 'unit_id' => $i['unit_id'],
                ])->all());
            }
        });

        return back()->with('success', 'Recipe saved.');
    }
}
