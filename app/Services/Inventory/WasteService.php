<?php

namespace App\Services\Inventory;

use App\Enums\StockMovementType;
use App\Enums\WasteReason;
use App\Models\Ingredient;
use App\Models\User;
use App\Models\WasteLog;
use Illuminate\Support\Facades\DB;

class WasteService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly UnitConverter $units,
    ) {}

    /** $unitId is optional; the quantity is converted to the ingredient's base unit. */
    public function log(Ingredient $ingredient, float|int|string $quantity, WasteReason $reason, User $user, ?string $notes = null, ?int $unitId = null): WasteLog
    {
        $base = $unitId === null || $unitId === $ingredient->base_unit_id
            ? (float) $quantity
            : $this->units->convert($quantity, $unitId, $ingredient->base_unit_id);

        return DB::transaction(function () use ($ingredient, $base, $reason, $user, $notes) {
            $log = WasteLog::query()->create([
                'ingredient_id' => $ingredient->id,
                'quantity' => number_format($base, 4, '.', ''),
                'reason' => $reason,
                'notes' => $notes,
                'user_id' => $user->id,
            ]);

            // Reference is the waste log, so each log posts exactly one movement.
            $movement = $this->stock->record($ingredient, StockMovementType::Waste, -$base, $ingredient->average_cost_cents, $log, $user, "Waste: {$reason->value}");

            $log->update(['stock_movement_id' => $movement?->id]);

            return $log;
        });
    }
}
