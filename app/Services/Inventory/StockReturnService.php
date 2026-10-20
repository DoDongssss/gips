<?php

namespace App\Services\Inventory;

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\User;

/**
 * Puts stock back for an order that was sold and then voided or refunded.
 *
 * It mirrors the order's own "sale" rows in the stock ledger, so exactly what was taken out (recipes
 * and add-ons included) is put back, at the same cost. Safe to run twice: StockService records one
 * "return" per (order, ingredient), so a second run changes nothing.
 */
class StockReturnService
{
    public function __construct(private readonly StockService $stock) {}

    /**
     * Automatic rule: a void (or cancel) before the kitchen started returns the stock.
     * After preparation started the food was made, so the cashier decides with returnForOrder().
     */
    public function returnIfNotPrepared(Order $order, OrderStatus $from, OrderStatus $to, ?User $user = null): int
    {
        if (! in_array($to, [OrderStatus::Voided, OrderStatus::Cancelled], true)) {
            return 0;
        }

        if (! in_array($from, [OrderStatus::Open, OrderStatus::Confirmed], true)) {
            return 0;
        }

        return $this->returnForOrder($order, $user, "Order {$order->order_number} {$to->value} before preparation");
    }

    /** @return int how many ingredients were put back (0 when nothing was deducted, or already returned) */
    public function returnForOrder(Order $order, ?User $user = null, ?string $note = null): int
    {
        $sales = StockMovement::query()
            ->where('type', StockMovementType::Sale->value)
            ->where('reference_type', $order->getMorphClass())
            ->where('reference_id', $order->getKey())
            ->get();

        $returned = 0;

        foreach ($sales->groupBy('ingredient_id') as $ingredientId => $rows) {
            $quantity = abs((float) $rows->sum('quantity_change'));

            if ($quantity <= 0) {
                continue;
            }

            $movement = $this->stock->record(
                (int) $ingredientId,
                StockMovementType::Return,
                $quantity,
                $rows->first()->unit_cost_cents,
                $order,
                $user,
                $note ?? "Order {$order->order_number} returned to stock",
            );

            $returned += $movement ? 1 : 0;
        }

        return $returned;
    }
}
