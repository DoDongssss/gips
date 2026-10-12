<?php

namespace App\Services\Orders;

use App\Enums\OrderChannel;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\User;
use App\Support\Audit;
use App\Support\BusinessDate;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function __construct(
        private OrderPricingService $pricing,
        private OrderNumberService $numbers,
        private OrderStatusService $statuses,
    ) {}

    /**
     * Create an order in one transaction: order, lines, add-ons, discounts, tax, history.
     * Idempotency (never creating it twice) is handled one level up by IdempotencyService.
     *
     * @param  array<string, mixed>  $input  validated cart
     */
    public function create(
        array $input,
        User $user,
        OrderChannel $channel = OrderChannel::Pos,
        ?int $deviceId = null,
        bool $confirm = true,
    ): Order {
        $order = DB::transaction(function () use ($input, $user, $channel, $deviceId, $confirm) {
            $priced = $this->pricing->price($input, $user, enforceApproval: true);
            $calc = $priced['calc'];
            $businessDate = BusinessDate::current();

            $order = Order::create([
                'order_number' => $this->numbers->next($businessDate),
                'business_date' => $businessDate,
                'channel' => $channel,
                'type' => $input['type'],
                'status' => OrderStatus::Open,
                'payment_status' => PaymentStatus::Unpaid,
                'created_by' => $user->id,
                'device_id' => $deviceId,
                'customer_name' => $input['customer_name'] ?? null,
                'notes' => $input['notes'] ?? null,
                'subtotal_cents' => $calc['subtotal_cents'],
                'discount_cents' => $calc['discount_cents'],
                'tax_cents' => $calc['tax_cents'],
                'total_cents' => $calc['total_cents'],
            ]);

            $order->statusHistory()->create([
                'from_status' => null,
                'to_status' => OrderStatus::Open->value,
                'user_id' => $user->id,
                'device_id' => $deviceId,
            ]);

            $itemIds = [];
            foreach ($priced['lines'] as $i => $line) {
                $item = $order->items()->create([
                    'product_id' => $line['product']->id,
                    'product_variant_id' => $line['variant']?->id,
                    'product_name' => $line['product_name'],
                    'variant_name' => $line['variant_name'],
                    'unit_price_cents' => $line['unit_price_cents'],
                    'quantity' => $line['quantity'],
                    'modifiers_total_cents' => $line['modifiers_total_cents'],
                    'discount_cents' => $calc['lines'][$i]['discount_cents'],
                    'tax_cents' => $calc['lines'][$i]['tax_cents'],
                    'line_total_cents' => $calc['lines'][$i]['line_total_cents'],
                    'status' => OrderItemStatus::Pending,
                    'notes' => $line['notes'],
                ]);
                $itemIds[$i] = $item->id;

                foreach ($line['modifiers'] as $modifier) {
                    $item->modifiers()->create($modifier + ['quantity' => 1]);
                }
            }

            foreach ($calc['discounts'] as $applied) {
                $row = $priced['discounts'][$applied['key']];
                $discount = $row['discount'];

                $order->discounts()->create([
                    'order_item_id' => $applied['line'] !== null ? $itemIds[$applied['line']] : null,
                    'discount_id' => $discount->id,
                    'name' => $discount->name,
                    'type' => $discount->type->value,
                    'value' => $discount->value,
                    'amount_cents' => $applied['amount_cents'],
                    'id_number' => $row['id_number'],
                    'approved_by' => $row['approved_by'],
                ]);

                if ($row['approved_by']) {
                    Audit::record(
                        'discounts',
                        'discount.approved',
                        'Discount approved for order',
                        $order,
                        [
                            'discount' => $discount->name,
                            'amount_cents' => $applied['amount_cents'],
                            'approved_by' => $row['approved_by'],
                            'id_number' => $row['id_number'],
                        ],
                    );
                }
            }

            if ($priced['tax'] && $calc['tax']) {
                $order->taxes()->create([
                    'tax_id' => $priced['tax']->id,
                    'name' => $priced['tax']->name,
                    'rate' => $priced['tax']->rate,
                    'is_inclusive' => $priced['tax']->is_inclusive,
                    'taxable_cents' => $calc['tax']['taxable_cents'],
                    'tax_cents' => $calc['tax']['tax_cents'],
                ]);
            }

            return $order;
        });

        if ($confirm) {
            $order = $this->statuses->transition($order, OrderStatus::Confirmed, $user, deviceId: $deviceId);
        }

        return $this->load($order);
    }

    public function load(Order $order): Order
    {
        return $order->load([
            'items.modifiers', 'discounts', 'taxes', 'payments.method', 'receipts', 'statusHistory',
        ]);
    }
}
