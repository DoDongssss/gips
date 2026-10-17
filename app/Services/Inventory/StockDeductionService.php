<?php

namespace App\Services\Inventory;

use App\Enums\ModifierAction;
use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\ModifierRecipeItem;
use App\Models\Order;
use App\Models\Recipe;
use App\Support\Qty;
use Illuminate\Support\Facades\DB;

/**
 * Turns a paid order into stock_movements rows through the recipes.
 *
 * Per unit sold: recipe amounts (divided by yield), then each chosen modifier:
 *   remove  - takes that ingredient's amount out (up to the quantity given)
 *   replace - takes the replaced ingredient out entirely, then adds the new one
 *   add     - adds the ingredient
 * Removals run before additions so oat milk replacing whole milk never cancels itself.
 * Safe to run twice: StockService skips a (sale, order, ingredient) it already recorded.
 */
class StockDeductionService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly UnitConverter $units,
    ) {}

    /** @return array{deducted: int, skipped_items: int} */
    public function deductForOrder(Order $order): array
    {
        $status = $order->payment_status instanceof \BackedEnum ? $order->payment_status->value : $order->payment_status;

        if ($status !== 'paid') {
            return ['deducted' => 0, 'skipped_items' => 0];
        }

        $items = DB::table('order_items')
            ->where('order_id', $order->id)
            ->where('status', '!=', 'voided')
            ->get(['id', 'product_id', 'product_variant_id', 'quantity']);

        if ($items->isEmpty()) {
            return ['deducted' => 0, 'skipped_items' => 0];
        }

        $recipes = Recipe::query()->with('items.ingredient')
            ->whereIn('product_id', $items->pluck('product_id')->unique())
            ->get()
            ->keyBy(fn (Recipe $r) => $r->product_id.':'.($r->product_variant_id ?? 0));

        $mods = DB::table('order_item_modifiers')
            ->whereIn('order_item_id', $items->pluck('id'))
            ->whereNotNull('modifier_id')
            ->get(['order_item_id', 'modifier_id', 'quantity'])
            ->groupBy('order_item_id');

        $modRecipes = ModifierRecipeItem::query()
            ->whereIn('modifier_id', $mods->flatten(1)->pluck('modifier_id')->unique())
            ->get()
            ->groupBy('modifier_id');

        $totals = [];
        $skipped = 0;

        foreach ($items as $item) {
            $recipe = $recipes->get($item->product_id.':'.($item->product_variant_id ?? 0))
                ?? $recipes->get($item->product_id.':0');

            if ($recipe === null) {
                $skipped++;

                continue;
            }

            $perUnit = $this->perUnit($recipe, $mods->get($item->id, collect()), $modRecipes);

            foreach ($perUnit as $ingredientId => $amount) {
                $totals[$ingredientId] = ($totals[$ingredientId] ?? 0) + $amount * (int) $item->quantity;
            }
        }

        $deducted = 0;
        $costs = Ingredient::withTrashed()->whereIn('id', array_keys($totals))->pluck('average_cost_cents', 'id');

        DB::transaction(function () use ($totals, $costs, $order, &$deducted) {
            foreach ($totals as $ingredientId => $amount) {
                $amount = Qty::round($amount);

                if ($amount <= 0) {
                    continue;
                }

                $movement = $this->stock->record(
                    $ingredientId,
                    StockMovementType::Sale,
                    -$amount,
                    $costs[$ingredientId] ?? null,
                    $order,
                    null,
                    "Order {$order->order_number}",
                );

                $deducted += $movement ? 1 : 0;
            }
        });

        return ['deducted' => $deducted, 'skipped_items' => $skipped];
    }

    /** @return array<int, float> ingredient id => quantity in its base unit, for ONE unit sold */
    private function perUnit(Recipe $recipe, $chosenModifiers, $modRecipes): array
    {
        $yield = max((float) $recipe->yield_quantity, 0.01);
        $map = [];

        foreach ($recipe->items as $line) {
            $base = $line->ingredient->base_unit_id;
            $map[$line->ingredient_id] = ($map[$line->ingredient_id] ?? 0)
                + $this->units->convert($line->quantity, $line->unit_id, $base) / $yield;
        }

        $adds = [];

        foreach ($chosenModifiers as $chosen) {
            $times = max((int) $chosen->quantity, 1);

            /** @var ModifierRecipeItem $rule */
            foreach ($modRecipes->get($chosen->modifier_id, collect()) as $rule) {
                $ingredient = Ingredient::withTrashed()->find($rule->ingredient_id);
                $amount = $this->units->convert($rule->quantity, $rule->unit_id, $ingredient->base_unit_id) * $times;

                match ($rule->action) {
                    ModifierAction::Remove => $map[$rule->ingredient_id] = max(0, ($map[$rule->ingredient_id] ?? 0) - $amount),
                    ModifierAction::Replace => $this->replace($map, $rule->replaces_ingredient_id, $adds, $rule->ingredient_id, $amount),
                    ModifierAction::Add => $adds[$rule->ingredient_id] = ($adds[$rule->ingredient_id] ?? 0) + $amount,
                };
            }
        }

        foreach ($adds as $id => $amount) {
            $map[$id] = ($map[$id] ?? 0) + $amount;
        }

        return $map;
    }

    private function replace(array &$map, ?int $replacedId, array &$adds, int $newId, float $amount): void
    {
        if ($replacedId !== null) {
            $map[$replacedId] = 0;
        }

        $adds[$newId] = ($adds[$newId] ?? 0) + $amount;
    }
}
