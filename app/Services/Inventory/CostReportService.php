<?php

namespace App\Services\Inventory;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\Recipe;
use App\Services\Reports\ReportService;
use App\Support\Qty;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class CostReportService
{
    public function __construct(
        private readonly UnitConverter $units,
        private readonly ReportService $reports,
    ) {}

    /**
     * Per ingredient: what came in, what the recipes used, waste, count corrections and
     * the value of each. "Variance" is count + adjustment movements: stock that vanished
     * (negative) or appeared (positive) beyond what recipes and recorded waste explain.
     *
     * Sale rows follow the order business date; other types follow movement time.
     */
    public function usage(CarbonInterface $from, CarbonInterface $to): array
    {
        $query = DB::table('stock_movements as m')
            ->join('ingredients as i', 'i.id', '=', 'm.ingredient_id')
            ->join('units as u', 'u.id', '=', 'i.base_unit_id');

        $this->scopeMovementsToPeriod($query, $from, $to, 'm');

        $rows = $query
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
                'purchased' => 0.0, 'used' => 0.0, 'waste' => 0.0, 'returned' => 0.0, 'variance' => 0.0,
                'used_cost_cents' => 0, 'waste_cost_cents' => 0, 'returned_cost_cents' => 0, 'variance_cost_cents' => 0];

            $qty = Qty::round($r->qty);
            $value = (int) round((float) $r->value_cents);

            match ($r->type) {
                StockMovementType::Purchase->value => $line['purchased'] += $qty,
                StockMovementType::Return->value => [$line['returned'] += $qty, $line['returned_cost_cents'] += $value],
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
                'needs_conversion' => ! $complete,
            ];
        }

        usort($out, fn ($a, $b) => ($b['food_cost_pct'] ?? -1) <=> ($a['food_cost_pct'] ?? -1));

        return $out;
    }

    /** Food cost for the product-level recipe at today's ingredient costs. */
    public function marginForProduct(Product $product): ?array
    {
        $recipe = Recipe::query()
            ->where('product_id', $product->id)
            ->whereNull('product_variant_id')
            ->with('items.ingredient')
            ->first();

        if ($recipe === null || $recipe->items->isEmpty()) {
            return null;
        }

        $price = (int) $product->base_price_cents;
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
        $costCents = $complete ? (int) round($cost) : null;

        return [
            'cost_cents' => $costCents,
            'margin_cents' => $complete ? $price - (int) round($cost) : null,
            'food_cost_pct' => $complete && $price > 0 ? round($cost / $price * 100, 1) : null,
            'needs_conversion' => ! $complete,
        ];
    }

    /**
     * Cost of goods sold (recipe deductions at their snapshot cost) against net sales for the period.
     * Net sales match {@see ReportService::summary()}. Sale COGS follow order business dates.
     */
    public function foodCostSummary(CarbonInterface $from, CarbonInterface $to): array
    {
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $sales = $this->reports->summary($fromDate, $toDate);

        $cogsQuery = DB::table('stock_movements as m')
            ->join('ingredients as i', 'i.id', '=', 'm.ingredient_id')
            ->where('m.type', StockMovementType::Sale->value);

        $this->scopeMovementsToPeriod($cogsQuery, $from, $to, 'm');

        $cogs = (int) round((float) -$cogsQuery
            ->sum(DB::raw('m.quantity_change * COALESCE(m.unit_cost_cents, i.average_cost_cents)')));

        $wasteQuery = DB::table('stock_movements as m')
            ->join('ingredients as i', 'i.id', '=', 'm.ingredient_id')
            ->where('m.type', StockMovementType::Waste->value);

        $this->scopeMovementsToPeriod($wasteQuery, $from, $to, 'm');

        $waste = (int) round((float) -$wasteQuery
            ->sum(DB::raw('m.quantity_change * COALESCE(m.unit_cost_cents, i.average_cost_cents)')));

        $net = (int) $sales['net_sales_cents'];

        return [
            'cogs_cents' => $cogs,
            'waste_cents' => $waste,
            'net_sales_cents' => $net,
            'gross_profit_cents' => $net - $cogs,
            'food_cost_pct' => $net > 0 ? round($cogs / $net * 100, 1) : null,
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

    /**
     * Sale movements use the linked order's business date; everything else uses movement time.
     */
    private function scopeMovementsToPeriod(Builder $query, CarbonInterface $from, CarbonInterface $to, string $alias = 'm'): void
    {
        $orderMorph = (new Order)->getMorphClass();
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();
        $start = $from->copy()->startOfDay();
        $end = $to->copy()->endOfDay();

        $query->where(function (Builder $outer) use ($alias, $orderMorph, $fromDate, $toDate, $start, $end) {
            $outer->where(function (Builder $sales) use ($alias, $orderMorph, $fromDate, $toDate) {
                $sales->where("{$alias}.type", StockMovementType::Sale->value)
                    ->where("{$alias}.reference_type", $orderMorph)
                    ->whereExists(function (Builder $order) use ($alias, $fromDate, $toDate) {
                        $order->select(DB::raw(1))
                            ->from('orders as o')
                            ->whereColumn('o.id', "{$alias}.reference_id")
                            ->whereBetween('o.business_date', [$fromDate, $toDate]);
                    });
            })->orWhere(function (Builder $other) use ($alias, $start, $end) {
                $other->where("{$alias}.type", '!=', StockMovementType::Sale->value)
                    ->whereBetween("{$alias}.created_at", [$start, $end]);
            })->orWhere(function (Builder $fallback) use ($alias, $start, $end) {
                $fallback->where("{$alias}.type", StockMovementType::Sale->value)
                    ->where(function (Builder $missing) use ($alias) {
                        $missing->whereNull("{$alias}.reference_type")
                            ->orWhereNull("{$alias}.reference_id");
                    })
                    ->whereBetween("{$alias}.created_at", [$start, $end]);
            });
        });
    }
}
