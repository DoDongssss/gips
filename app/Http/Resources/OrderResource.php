<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'order_number' => $this->order_number,
            'business_date' => $this->business_date->toDateString(),
            'channel' => $this->channel->value,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'payment_status' => $this->payment_status->value,
            'customer_name' => $this->customer_name,
            'notes' => $this->notes,
            'subtotal_cents' => $this->subtotal_cents,
            'discount_cents' => $this->discount_cents,
            'tax_cents' => $this->tax_cents,
            'tip_cents' => $this->tip_cents,
            'total_cents' => $this->total_cents,
            'paid_cents' => $this->paid_cents,
            'balance_cents' => $this->balanceCents(),
            'requires_verification' => $this->requires_verification,
            'cancel_reason' => $this->cancel_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),

            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_name' => $i->product_name,
                'variant_name' => $i->variant_name,
                'unit_price_cents' => $i->unit_price_cents,
                'quantity' => $i->quantity,
                'modifiers_total_cents' => $i->modifiers_total_cents,
                'discount_cents' => $i->discount_cents,
                'tax_cents' => $i->tax_cents,
                'line_total_cents' => $i->line_total_cents,
                'status' => $i->status->value,
                'notes' => $i->notes,
                'modifiers' => $i->relationLoaded('modifiers') ? $i->modifiers->map(fn ($m) => [
                    'group_name' => $m->group_name,
                    'modifier_name' => $m->modifier_name,
                    'price_delta_cents' => $m->price_delta_cents,
                ])->values() : [],
            ])->values()),

            'discounts' => $this->whenLoaded('discounts', fn () => $this->discounts->map(fn ($d) => [
                'name' => $d->name,
                'type' => $d->type,
                'value' => $d->value,
                'amount_cents' => $d->amount_cents,
                'order_item_id' => $d->order_item_id,
                'id_number' => $d->id_number,
                'approved_by' => $d->approved_by,
            ])->values()),

            'taxes' => $this->whenLoaded('taxes', fn () => $this->taxes->map(fn ($t) => [
                'name' => $t->name,
                'rate' => (string) $t->rate,
                'is_inclusive' => $t->is_inclusive,
                'taxable_cents' => $t->taxable_cents,
                'tax_cents' => $t->tax_cents,
            ])->values()),

            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($p) => [
                'id' => $p->id,
                'uuid' => $p->uuid,
                'method' => $p->relationLoaded('method') ? $p->method?->name : null,
                'method_code' => $p->relationLoaded('method') ? $p->method?->code : null,
                'amount_cents' => $p->amount_cents,
                'tendered_cents' => $p->tendered_cents,
                'change_cents' => $p->change_cents,
                'tip_cents' => $p->tip_cents,
                'status' => $p->status->value,
                'reference_no' => $p->reference_no,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'refunded_cents' => $p->relationLoaded('refunds') ? (int) $p->refunds->sum('amount_cents') : 0,
            ])->values()),

            'refunds' => $this->whenLoaded('refunds', fn () => $this->refunds->map(fn ($r) => [
                'id' => $r->id,
                'payment_id' => $r->payment_id,
                'amount_cents' => $r->amount_cents,
                'reason' => $r->reason,
                'refunded_at' => $r->refunded_at?->toIso8601String(),
            ])->values()),

            'receipts' => $this->whenLoaded('receipts', fn () => $this->receipts->map(fn ($r) => [
                'id' => $r->id,
                'receipt_number' => $r->receipt_number,
                'type' => $r->type->value,
                'printed_count' => $r->printed_count,
                'content' => $r->content,
            ])->values()),

            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($h) => [
                'from' => $h->from_status,
                'to' => $h->to_status,
                'note' => $h->note,
                'at' => $h->created_at?->toIso8601String(),
            ])->values()),
        ];
    }
}
