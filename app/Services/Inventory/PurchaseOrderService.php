<?php

namespace App\Services\Inventory;

use App\Enums\PurchaseOrderStatus;
use App\Models\PurchaseOrder;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderService
{
    /** @param array{supplier_id:int, expected_at?:?string, notes?:?string, items:array<int,array{ingredient_id:int, unit_id:int, quantity:float|int|string, unit_cost_cents:int}>} $data */
    public function create(array $data, User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $user) {
            $po = PurchaseOrder::query()->create([
                'po_number' => 'TMP-'.Str::uuid(),
                'supplier_id' => $data['supplier_id'],
                'status' => PurchaseOrderStatus::Draft,
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
                'total_cents' => 0,
                'created_by' => $user->id,
            ]);

            $po->update(['po_number' => sprintf('PO-%06d', $po->id)]);
            $this->syncItems($po, $data['items']);

            return $po;
        });
    }

    /** Only a draft can be edited. */
    public function update(PurchaseOrder $po, array $data): PurchaseOrder
    {
        $this->assertStatus($po, [PurchaseOrderStatus::Draft], 'Only a draft purchase order can be edited.');

        return DB::transaction(function () use ($po, $data) {
            $po->update([
                'supplier_id' => $data['supplier_id'],
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            $this->syncItems($po, $data['items']);

            return $po;
        });
    }

    public function send(PurchaseOrder $po): PurchaseOrder
    {
        $this->assertStatus($po, [PurchaseOrderStatus::Draft], 'Only a draft purchase order can be sent.');

        if (! $po->items()->exists()) {
            throw new DomainException('Add at least one item before sending.');
        }

        $po->update(['status' => PurchaseOrderStatus::Sent, 'ordered_at' => now()]);

        return $po;
    }

    /** Cancelling is blocked once anything was received; close it by receiving the rest instead. */
    public function cancel(PurchaseOrder $po): PurchaseOrder
    {
        $this->assertStatus($po, [PurchaseOrderStatus::Draft, PurchaseOrderStatus::Sent], 'This purchase order can no longer be cancelled.');

        if ($po->receipts()->exists()) {
            throw new DomainException('Goods were already received against this purchase order.');
        }

        $po->update(['status' => PurchaseOrderStatus::Cancelled]);

        return $po;
    }

    private function syncItems(PurchaseOrder $po, array $items): void
    {
        $po->items()->delete();
        $total = 0;

        foreach ($items as $row) {
            $po->items()->create([
                'ingredient_id' => $row['ingredient_id'],
                'unit_id' => $row['unit_id'],
                'quantity_ordered' => number_format((float) $row['quantity'], 4, '.', ''),
                'unit_cost_cents' => $row['unit_cost_cents'],
            ]);
            $total += (int) round((float) $row['quantity'] * (int) $row['unit_cost_cents']);
        }

        $po->update(['total_cents' => $total]);
    }

    private function assertStatus(PurchaseOrder $po, array $allowed, string $message): void
    {
        if (! in_array($po->status, $allowed, true)) {
            throw new DomainException($message);
        }
    }
}
