<?php

namespace App\Services\Inventory;

use App\Enums\StockCountStatus;
use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\User;
use App\Support\Qty;
use DomainException;
use Illuminate\Support\Facades\DB;

class StockCountService
{
    public function __construct(private readonly StockService $stock) {}

    /** Snapshot the expected quantity of every active ingredient (or the ones given). */
    public function start(User $user, ?array $ingredientIds = null, ?string $notes = null): StockCount
    {
        if (StockCount::query()->where('status', StockCountStatus::InProgress)->exists()) {
            throw new DomainException('A stock count is already in progress. Finish it first.');
        }

        return DB::transaction(function () use ($user, $ingredientIds, $notes) {
            $count = StockCount::query()->create([
                'status' => StockCountStatus::InProgress,
                'started_by' => $user->id,
                'started_at' => now(),
                'notes' => $notes,
            ]);

            Ingredient::query()->with('stockLevel')->where('is_active', true)
                ->when($ingredientIds, fn ($q) => $q->whereIn('id', $ingredientIds))
                ->orderBy('name')
                ->get()
                ->each(fn (Ingredient $i) => $count->items()->create([
                    'ingredient_id' => $i->id,
                    'expected_quantity' => Qty::fmt($i->stockLevel?->quantity ?? 0),
                ]));

            return $count;
        });
    }

    /**
     * Save counted quantities. A blank value clears the line (not counted).
     *
     * @param  array<int, float|int|string|null>  $counted  ingredient id => counted quantity
     */
    public function saveCounts(StockCount $count, array $counted): void
    {
        $this->assertOpen($count);

        DB::transaction(function () use ($count, $counted) {
            foreach ($count->items()->whereIn('ingredient_id', array_keys($counted))->get() as $item) {
                $value = $counted[$item->ingredient_id];
                $isBlank = $value === null || $value === '';

                $item->update([
                    'counted_quantity' => $isBlank ? null : Qty::fmt($value),
                    'variance' => $isBlank ? null : Qty::fmt((float) $value - (float) $item->expected_quantity),
                ]);
            }
        });
    }

    /**
     * Post every counted variance as a 'count' movement. Variance is measured against the
     * snapshot taken at start, so sales rung up while counting stay correct.
     */
    public function complete(StockCount $count, User $user): StockCount
    {
        $this->assertOpen($count);

        return DB::transaction(function () use ($count, $user) {
            /** @var StockCountItem $item */
            foreach ($count->items()->whereNotNull('counted_quantity')->get() as $item) {
                $variance = Qty::round($item->variance);

                if ($variance == 0.0) {
                    continue;
                }

                $this->stock->record(
                    $item->ingredient_id,
                    StockMovementType::Count,
                    $variance,
                    $item->ingredient->average_cost_cents,
                    $count,
                    $user,
                    'Stock count #'.$count->id,
                );
            }

            $count->update(['status' => StockCountStatus::Completed, 'completed_at' => now()]);

            return $count;
        });
    }

    private function assertOpen(StockCount $count): void
    {
        if ($count->status !== StockCountStatus::InProgress) {
            throw new DomainException('This stock count is already completed.');
        }
    }
}
