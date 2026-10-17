<?php

namespace App\Services\Inventory;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\Product;
use App\Models\Recipe;
use App\Support\Qty;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class CostReportService
{
    public function __construct(private readonly UnitConverter $units) {}

    /**
     * Per ingredient: what came in, what the recipes used, waste, count corrections and
     * the value of each. "Variance" is count + adjustment movements: stock that vanished
     * (negative) or appeared (positive) beyond what recipes and recorded waste explain.
     */
    public function usage(CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = DB::table('stock_movements as m')
            ->join('ingredients as i', 'i.id', '=', 'm.ingredient_id')
            ->join('units as u', 'u.id', '=', 'i.base_unit_id')
            ->whereBetween('m.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('m.ingredient_id', 'i.name', 'u.abbreviation', 'm.type')
            ->get([
                'm.ingredient_id', 'i.name', 'u.abbreviation as unit', 'm.type',
                DB::raw('SUM(m.quantity_change) as qty'),
                DB::raw('SUM(m.quantity_change * COALESCE(m.unit_cost_cents, i.average_cost_cents)) as value_cents'),
            ]);

        $out = [];

        foreach ($rows as $r) {
            $line = &$out[$r->ingredient_id];
            $line ??= ['ingredient_id' => $r->ingredient_id, 'ingredient' => $r->name, 'unit' => $r->unit,
                'purchased' => 0.0, 'used' => 0.0, 'waste' => 0.0, 'variance' => 0.0, 'used_cost_cents' => 0, 'waste_cost_cents' => 0, 'variance_cost_cents' => 0];

            $qty = Qty::round($r->qty);
            $value = (int) round((float) $r->value_cents);

            match ($r->type) {
                StockMovementType::Purchase->value => $line['purchased'] += $qty,
                StockMovementType::Sale->value => [$line['used'] -= $qty, $line['used_cost_cents'] -= $value],
                StockMovementType::Waste->value => [$line['waste'] -= $qty, $line['waste_cost_cents'] -= $value],
                StockMovementType::Count->value, StockMovementType::Adjustment->value => [$line['variance'] += $qty, $line['variance_cost_cents'] += $value],
                default => null,
            };
            unset($line);
        }

        usort($out, fn ($a, $b) => $b['used_cost_cents'] <=> $a['used_cost_cents']);

        return array_values($out);
    }

    /**
     * Food cost per product/variant from today's average costs: recipe cost, price, margin.
     * Recipes whose units cannot be converted are listed with cost null instead of failing the report.
     */
    public function productMargins(): array
    {
        $recipes = Recipe::query()->with(['product', 'variant', 'items.ingredient'])->get();
        $out = [];

        foreach ($recipes as $recipe) {
            if ($recipe->product === null) {
                continue;
            }

            $price = $recipe->variant?->price_cents ?? $recipe->product->base_price_cents;
            $cost = 0.0;
            $complete = true;

            foreach ($recipe->items as $item) {
                if (! $this->units->canConvert($item->unit_id, $item->ingredient->base_unit_id)) {
                    $complete = false;

                    continue;
                }

                $cost += $this->units->convert($item->quantity, $item->unit_id, $item->ingredient->base_unit_id)
                    * (float) $item->ingredient->average_cost_cents;
            }

            $cost = $cost / max((float) $recipe->yield_quantity, 0.01);

            $out[] = [
                'product_id' => $recipe->product_id,
                'product' => $recipe->product->name,
                'variant' => $recipe->variant?->name,
                'price_cents' => (int) $price,
                'cost_cents' => $complete ? (int) round($cost) : null,
                'margin_cents' => $complete ? (int) $price - (int) round($cost) : null,
                'food_cost_pct' => $complete && $price > 0 ? round($cost / $price * 100, 1) : null,
            ];
        }

        usort($out, fn ($a, $b) => ($b['food_cost_pct'] ?? -1) <=> ($a['food_cost_pct'] ?? -1));

        return $out;
    }

    /** Cost of goods sold (recipe deductions at their snapshot cost) against net sales for the period. */
    public function foodCostSummary(CarbonInterface $from, CarbonInterface $to): array
    {
        $cogs = (int) round((float) -DB::table('stock_movements as m')
            ->join('ingredients as i', 'i.id', '=', 'm.ingredient_id')
            ->where('m.type', StockMovementType::Sale->value)
            ->whereBetween('m.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->sum(DB::raw('m.quantity_change * COALESCE(m.unit_cost_cents, i.average_cost_cents)')));

        $sales = (int) DB::table('orders')
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['voided', 'cancelled'])
            ->whereBetween('business_date', [$from->toDateString(), $to->toDateString()])
            ->sum(DB::raw('subtotal_cents - discount_cents'));

        return [
            'cogs_cents' => $cogs,
            'net_sales_cents' => $sales,
            'food_cost_pct' => $sales > 0 ? round($cogs / $sales * 100, 1) : null,
        ];
    }

    /** Stock on hand with its value, flagging negatives and anything at or under the reorder level. */
    public function stockOnHand(): array
    {
        return Ingredient::query()->with(['stockLevel', 'baseUnit:id,abbreviation'])->where('is_active', true)->orderBy('name')->get()
            ->map(function (Ingredient $i) {
                $qty = Qty::round($i->stockLevel?->quantity ?? 0);

                return [
                    'id' => $i->id,
                    'name' => $i->name,
                    'unit' => $i->baseUnit?->abbreviation,
                    'quantity' => Qty::fmt($qty),
                    'reorder_level' => Qty::fmt($i->reorder_level),
                    'value_cents' => (int) round(max($qty, 0) * (float) $i->average_cost_cents),
                    'is_negative' => $qty < 0,
                    'is_low' => (float) $i->reorder_level > 0 && $qty <= (float) $i->reorder_level,
                ];
            })->all();
    }
}
