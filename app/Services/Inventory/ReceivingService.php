<?php

namespace App\Services\Inventory;

use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Models\GoodsReceipt;
use App\Models\Ingredient;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockLevel;
use App\Models\User;
use App\Support\Qty;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Receiving a delivery adds stock and re-averages each ingredient's cost.
 * New average = (on hand x old average + received x new cost) / (on hand + received),
 * where negative stock counts as zero so a backlog of unrecorded sales cannot distort cost.
 */
class ReceivingService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly UnitConverter $units,
    ) {}

    /**
     * @param  array{supplier_id:int, purchase_order_id?:?int, received_at?:?string, invoice_no?:?string, notes?:?string, items:array<int,array{purchase_order_item_id?:?int, ingredient_id:int, unit_id:int, quantity:float|int|string, unit_cost_cents:int, batch_no?:?string, expires_on?:?string}>}  $data
     */
    public function receive(array $data, User $user): GoodsReceipt
    {
        return DB::transaction(function () use ($data, $user) {
            $po = null;

            if (! empty($data['purchase_order_id'])) {
                $po = PurchaseOrder::query()->lockForUpdate()->findOrFail($data['purchase_order_id']);

                if (! in_array($po->status, [PurchaseOrderStatus::Sent, PurchaseOrderStatus::Partial], true)) {
                    throw new DomainException('Only a sent or partly received purchase order can receive goods.');
                }

                if ($po->supplier_id !== (int) $data['supplier_id']) {
                    throw new DomainException('The supplier does not match the purchase order.');
                }
            }

            $receipt = GoodsReceipt::query()->create([
                'receipt_number' => 'TMP-'.Str::uuid(),
                'purchase_order_id' => $po?->id,
                'supplier_id' => $data['supplier_id'],
                'received_at' => $data['received_at'] ?? now(),
                'received_by' => $user->id,
                'invoice_no' => $data['invoice_no'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            $receipt->update(['receipt_number' => sprintf('GR-%06d', $receipt->id)]);

            // ingredient id => [base quantity, total cost in centavos]
            $perIngredient = [];

            foreach ($data['items'] as $row) {
                $ingredient = Ingredient::withTrashed()->findOrFail($row['ingredient_id']);
                $baseQty = $this->units->convert($row['quantity'], $row['unit_id'], $ingredient->base_unit_id);

                if ($baseQty <= 0) {
                    throw new DomainException("Received quantity for {$ingredient->name} must be above zero.");
                }

                $poItem = null;

                if (! empty($row['purchase_order_item_id'])) {
                    $poItem = PurchaseOrderItem::query()->lockForUpdate()->findOrFail($row['purchase_order_item_id']);

                    if ($po === null || $poItem->purchase_order_id !== $po->id) {
                        throw new DomainException('That line does not belong to this purchase order.');
                    }

                    $poItem->update(['quantity_received' => Qty::fmt($poItem->quantity_received + $this->units->convert($row['quantity'], $row['unit_id'], $poItem->unit_id))]);
                }

                $receipt->items()->create([
                    'purchase_order_item_id' => $poItem?->id,
                    'ingredient_id' => $ingredient->id,
                    'unit_id' => $row['unit_id'],
                    'quantity' => Qty::fmt($row['quantity']),
                    'unit_cost_cents' => $row['unit_cost_cents'],
                    'batch_no' => $row['batch_no'] ?? null,
                    'expires_on' => $row['expires_on'] ?? null,
                ]);

                // Total cost of the line; divided by base quantity later to get cost per base unit.
                $lineCost = (float) $row['unit_cost_cents'] * (float) $row['quantity'];

                $perIngredient[$ingredient->id]['qty'] = ($perIngredient[$ingredient->id]['qty'] ?? 0) + $baseQty;
                $perIngredient[$ingredient->id]['cost'] = ($perIngredient[$ingredient->id]['cost'] ?? 0) + $lineCost;
                $perIngredient[$ingredient->id]['ingredient'] = $ingredient;
            }

            foreach ($perIngredient as $id => $line) {
                /** @var Ingredient $ingredient */
                $ingredient = $line['ingredient'];
                $unitCost = $line['cost'] / $line['qty'];

                $onHand = max(0.0, Qty::round(StockLevel::query()->where('ingredient_id', $id)->value('quantity') ?? 0));
                $newAverage = ($onHand * (float) $ingredient->average_cost_cents + $line['qty'] * $unitCost) / ($onHand + $line['qty']);

                $this->stock->record($ingredient, StockMovementType::Purchase, $line['qty'], $unitCost, $receipt, $user, "Receipt {$receipt->receipt_number}");

                $ingredient->update(['average_cost_cents' => Qty::fmt($newAverage)]);
            }

            if ($po !== null) {
                $this->refreshStatus($po);
            }

            return $receipt;
        });
    }

    private function refreshStatus(PurchaseOrder $po): void
    {
        $complete = $po->items()->get()->every(
            fn (PurchaseOrderItem $i) => (float) $i->quantity_received >= (float) $i->quantity_ordered,
        );

        $po->update(['status' => $complete ? PurchaseOrderStatus::Received : PurchaseOrderStatus::Partial]);
    }
}
