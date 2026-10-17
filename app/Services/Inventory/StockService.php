<?php

namespace App\Services\Inventory;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use App\Notifications\LowStockNotification;
use App\Support\Qty;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * The only place stock changes. Every change inserts a stock_movements row and moves the
 * cached stock_levels row in the same transaction. Stock may go negative; it is flagged,
 * never blocked, because a sale already happened.
 */
class StockService
{
    /**
     * @return StockMovement|null null when this exact reference was already recorded (a retry)
     */
    public function record(
        Ingredient|int $ingredient,
        StockMovementType $type,
        float|int|string $quantityChange,
        float|int|string|null $unitCost = null,
        ?Model $reference = null,
        ?User $user = null,
        ?string $notes = null,
    ): ?StockMovement {
        $ingredientId = $ingredient instanceof Ingredient ? $ingredient->id : $ingredient;
        $change = Qty::round($quantityChange);

        [$movement, $before, $after] = DB::transaction(function () use ($ingredientId, $type, $change, $unitCost, $reference, $user, $notes) {
            StockLevel::query()->firstOrCreate(['ingredient_id' => $ingredientId], ['quantity' => 0]);

            // The row lock serializes concurrent changes to the same ingredient.
            $level = StockLevel::query()->where('ingredient_id', $ingredientId)->lockForUpdate()->first();

            if ($reference !== null) {
                $exists = StockMovement::query()
                    ->where('type', $type->value)
                    ->where('reference_type', $reference->getMorphClass())
                    ->where('reference_id', $reference->getKey())
                    ->where('ingredient_id', $ingredientId)
                    ->exists();

                if ($exists) {
                    return [null, null, null];
                }
            }

            $movement = StockMovement::query()->create([
                'ingredient_id' => $ingredientId,
                'type' => $type,
                'quantity_change' => Qty::fmt($change),
                'unit_cost_cents' => $unitCost === null ? null : Qty::fmt($unitCost),
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'user_id' => $user?->id,
                'notes' => $notes,
            ]);

            $before = Qty::round($level->quantity);
            $after = Qty::round($before + $change);
            $level->update(['quantity' => Qty::fmt($after)]);

            return [$movement, $before, $after];
        });

        if ($movement !== null) {
            $this->alertIfLow($ingredientId, $before, $after);
        }

        return $movement;
    }

    /** A manual correction. The note is required so the ledger explains itself. */
    public function adjust(Ingredient $ingredient, float|int|string $quantityChange, string $notes, User $user): StockMovement
    {
        return $this->record($ingredient, StockMovementType::Adjustment, $quantityChange, $ingredient->average_cost_cents, null, $user, $notes);
    }

    public function onHand(Ingredient|int $ingredient): float
    {
        $id = $ingredient instanceof Ingredient ? $ingredient->id : $ingredient;

        return Qty::round(StockLevel::query()->where('ingredient_id', $id)->value('quantity') ?? 0);
    }

    /** Recompute stock_levels from the ledger. Returns how many rows changed. */
    public function rebuild(): int
    {
        $changed = 0;

        $sums = StockMovement::query()
            ->selectRaw('ingredient_id, SUM(quantity_change) as total')
            ->groupBy('ingredient_id')
            ->pluck('total', 'ingredient_id');

        Ingredient::withTrashed()->pluck('id')->each(function (int $id) use ($sums, &$changed) {
            $correct = Qty::fmt($sums[$id] ?? 0);
            $level = StockLevel::query()->firstOrNew(['ingredient_id' => $id]);

            if (! $level->exists || Qty::fmt($level->quantity) !== $correct) {
                $level->quantity = $correct;
                $level->save();
                $changed++;
            }
        });

        return $changed;
    }

    /** Alert once, when stock crosses down to the reorder level, not on every sale below it. */
    private function alertIfLow(int $ingredientId, float $before, float $after): void
    {
        $ingredient = Ingredient::query()->with('baseUnit')->find($ingredientId);

        if ($ingredient === null || ! $ingredient->is_active) {
            return;
        }

        $level = Qty::round($ingredient->reorder_level);

        if ($level <= 0 || $before <= $level || $after > $level) {
            return;
        }

        $recipients = User::query()->where('is_active', true)
            ->where(fn ($q) => $q->permission('inventory.adjust')->orWhereHas('roles', fn ($r) => $r->where('name', 'super-admin')))
            ->get();

        Notification::send($recipients, new LowStockNotification($ingredient, Qty::fmt($after)));
    }
}
