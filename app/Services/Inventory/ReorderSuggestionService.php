<?php

namespace App\Services\Inventory;

use App\Models\Supplier;
use App\Models\SupplierIngredient;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReorderSuggestionService
{
    /**
     * Ingredients at or below reorder level, with a suggested order quantity.
     *
     * @return Collection<int, array{
     *     ingredient_id: int,
     *     name: string,
     *     quantity_on_hand: string,
     *     reorder_level: string,
     *     suggested_quantity: string,
     *     unit_id: int,
     *     unit_abbreviation: string,
     *     supplier_id: int|null,
     *     supplier_name: string|null,
     *     unit_cost_cents: int|null
     * }>
     */
    public function suggestions(): Collection
    {
        $rows = DB::table('ingredients as i')
            ->join('stock_levels as s', 's.ingredient_id', '=', 'i.id')
            ->join('units as u', 'u.id', '=', 'i.purchase_unit_id')
            ->where('i.is_active', true)
            ->where('i.reorder_level', '>', 0)
            ->whereColumn('s.quantity', '<=', 'i.reorder_level')
            ->orderBy('i.name')
            ->get([
                'i.id',
                'i.name',
                'i.reorder_level',
                'i.purchase_unit_id',
                's.quantity',
                'u.abbreviation as unit_abbreviation',
            ]);

        if ($rows->isEmpty()) {
            return collect();
        }

        $ingredientIds = $rows->pluck('id')->all();

        $preferredPrices = SupplierIngredient::query()
            ->whereIn('ingredient_id', $ingredientIds)
            ->orderByDesc('is_preferred')
            ->orderBy('unit_cost_cents')
            ->get()
            ->groupBy('ingredient_id');

        $suppliers = Supplier::query()->whereIn('id', $preferredPrices->flatten()->pluck('supplier_id')->unique())->pluck('name', 'id');

        return $rows->map(function ($row) use ($preferredPrices, $suppliers) {
            $onHand = (float) $row->quantity;
            $reorder = (float) $row->reorder_level;
            $target = max($reorder * 2, $reorder + 1);
            $suggested = max(0, $target - $onHand);

            $price = $preferredPrices->get($row->id)?->first();

            return [
                'ingredient_id' => (int) $row->id,
                'name' => $row->name,
                'quantity_on_hand' => number_format($onHand, 4, '.', ''),
                'reorder_level' => number_format($reorder, 4, '.', ''),
                'suggested_quantity' => number_format($suggested, 4, '.', ''),
                'unit_id' => (int) $row->purchase_unit_id,
                'unit_abbreviation' => (string) $row->unit_abbreviation,
                'supplier_id' => $price?->supplier_id,
                'supplier_name' => $price ? ($suppliers[$price->supplier_id] ?? null) : null,
                'unit_cost_cents' => $price?->unit_cost_cents,
            ];
        })->filter(fn (array $row) => (float) $row['suggested_quantity'] > 0)->values();
    }

    /**
     * @return array{created: int, skipped: int}
     */
    public function createDraftPurchaseOrders(PurchaseOrderService $orders, User $user): array
    {
        $lines = $this->suggestions()->filter(fn (array $row) => $row['supplier_id'] !== null);

        $created = 0;
        $all = $this->suggestions();
        $skipped = $all->filter(fn (array $row) => $row['supplier_id'] === null)->count();

        foreach ($lines->groupBy('supplier_id') as $supplierId => $items) {
            $payload = [
                'supplier_id' => (int) $supplierId,
                'notes' => 'Auto-generated from low-stock suggestions.',
                'items' => $items->map(fn (array $row) => [
                    'ingredient_id' => $row['ingredient_id'],
                    'unit_id' => $row['unit_id'],
                    'quantity' => $row['suggested_quantity'],
                    'unit_cost_cents' => $row['unit_cost_cents'] ?? 0,
                ])->values()->all(),
            ];

            $orders->create($payload, $user);
            $created++;
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
