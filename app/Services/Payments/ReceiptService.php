<?php

namespace App\Services\Payments;

use App\Enums\ReceiptType;
use App\Models\DocumentSequence;
use App\Models\Order;
use App\Models\Receipt;
use App\Models\User;
use App\Support\PosSettings;
use Illuminate\Support\Facades\DB;

class ReceiptService
{
    /** Issue the sale receipt once an order is fully paid. Safe to call twice. */
    public function issueSale(Order $order, ?User $user = null): Receipt
    {
        return DB::transaction(function () use ($order, $user) {
            $existing = $order->receipts()->where('type', ReceiptType::Sale->value)->first();
            if ($existing) {
                return $existing;
            }

            return $order->receipts()->create([
                'receipt_number' => 'R-'.str_pad((string) DocumentSequence::next('receipt'), 8, '0', STR_PAD_LEFT),
                'type' => ReceiptType::Sale,
                'content' => $this->snapshot($order->fresh(['items.modifiers', 'discounts', 'taxes', 'payments.method', 'creator'])),
                'issued_by' => $user?->id,
            ]);
        });
    }

    /** Count a print or reprint. The stored snapshot is what gets printed, never live data. */
    public function markPrinted(Receipt $receipt): Receipt
    {
        $receipt->update([
            'printed_count' => $receipt->printed_count + 1,
            'last_printed_at' => now(),
        ]);

        return $receipt;
    }

    /** @return array<string, mixed> */
    private function snapshot(Order $order): array
    {
        $tax = $order->taxes->first();

        return [
            'business' => [
                'name' => PosSettings::get('business', 'name', config('app.name')),
                'address' => PosSettings::get('business', 'address'),
                'tin' => PosSettings::get('business', 'tin'),
                'phone' => PosSettings::get('business', 'phone'),
            ],
            'header' => PosSettings::get('receipt', 'header'),
            'footer' => PosSettings::get('receipt', 'footer'),
            'order_number' => $order->order_number,
            'order_type' => $order->type->value,
            'business_date' => $order->business_date->toDateString(),
            'issued_at' => now()->toIso8601String(),
            'cashier' => $order->creator?->name,
            'customer_name' => $order->customer_name,
            'items' => $order->items->map(fn ($i) => [
                'name' => $i->product_name,
                'variant' => $i->variant_name,
                'quantity' => $i->quantity,
                'unit_price_cents' => $i->unit_price_cents,
                'modifiers' => $i->modifiers->map(fn ($m) => ['name' => $m->modifier_name, 'price_delta_cents' => $m->price_delta_cents])->all(),
                'discount_cents' => $i->discount_cents,
                'line_total_cents' => $i->line_total_cents,
                'notes' => $i->notes,
            ])->all(),
            'discounts' => $order->discounts->map(fn ($d) => [
                'name' => $d->name, 'amount_cents' => $d->amount_cents, 'id_number' => $d->id_number,
            ])->all(),
            'tax' => $tax ? [
                'name' => $tax->name,
                'rate' => (string) $tax->rate,
                'is_inclusive' => $tax->is_inclusive,
                'vatable_sales_cents' => $tax->taxable_cents,
                'tax_cents' => $tax->tax_cents,
            ] : null,
            'subtotal_cents' => $order->subtotal_cents,
            'discount_cents' => $order->discount_cents,
            'tax_cents' => $order->tax_cents,
            'tip_cents' => $order->tip_cents,
            'total_cents' => $order->total_cents,
            'payments' => $order->payments->map(fn ($p) => [
                'method' => $p->method->name,
                'amount_cents' => $p->amount_cents,
                'tendered_cents' => $p->tendered_cents,
                'change_cents' => $p->change_cents,
                'reference_no' => $p->reference_no,
            ])->all(),
        ];
    }
}
