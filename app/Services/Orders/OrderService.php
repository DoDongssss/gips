<?php

namespace App\Services\Orders;

use App\Enums\ApprovalAction;
use App\Enums\OrderChannel;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\User;
use App\Services\Shifts\ShiftService;
use App\Support\Audit;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private OrderPricingService $pricing,
        private OrderNumberService $numbers,
        private OrderStatusService $statuses,
        private ShiftService $shifts,
        private ApprovalService $approvals,
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
        $order = DB::transaction(function () use ($input, $user, $channel, $deviceId) {
            $priced = $this->pricing->price($input, $user, enforceApproval: true);
            $calc = $priced['calc'];
            $businessDate = BusinessDate::current();
            ClosedDay::assertOpen($businessDate, 'order');

            $order = Order::create([
                'shift_id' => $this->shifts->current($user)?->id,
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

            $this->persist($order, $priced, $user);

            return $order;
        });

        if ($confirm) {
            $order = $this->statuses->transition($order, OrderStatus::Confirmed, $user, deviceId: $deviceId);
        }

        return $this->load($order);
    }

    /**
     * Replace the contents of an order nobody has paid for or started preparing yet (for example a
     * kiosk order waiting at the counter) with the cart the cashier edited. Everything is priced again
     * from the database, exactly like a new order, and the order keeps its number.
     *
     * @param  array<string, mixed>  $input  validated cart (same shape as create())
     */
    public function update(Order $order, array $input, User $user): Order
    {
        DB::transaction(function () use ($order, $input, $user) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== OrderStatus::Open || $order->payment_status !== PaymentStatus::Unpaid || $order->paid_cents > 0) {
                throw ValidationException::withMessages(['order' => 'This order can no longer be changed. It may have been paid, cancelled or sent to the kitchen.']);
            }

            $priced = $this->pricing->price($input, $user, enforceApproval: true);
            $calc = $priced['calc'];
            $before = $order->items()->count();

            foreach ($order->items()->get() as $item) {
                $item->modifiers()->delete();
            }
            $order->items()->delete();
            $order->discounts()->delete();
            $order->taxes()->delete();

            $order->update([
                'type' => $input['type'],
                'customer_name' => $input['customer_name'] ?? null,
                'notes' => $input['notes'] ?? null,
                'subtotal_cents' => $calc['subtotal_cents'],
                'discount_cents' => $calc['discount_cents'],
                'tax_cents' => $calc['tax_cents'],
                'total_cents' => $calc['total_cents'],
            ]);

            $this->persist($order, $priced, $user);

            Audit::record('orders', 'order.edited', 'Order changed before payment', $order, [
                'lines_before' => $before,
                'lines_after' => count($priced['lines']),
                'total_cents' => $calc['total_cents'],
            ]);
        });

        return $this->load($order->refresh());
    }

    public function load(Order $order): Order
    {
        return $order->load([
            'items.modifiers', 'discounts', 'taxes', 'payments.method', 'payments.refunds', 'refunds', 'receipts', 'statusHistory',
        ]);
    }

    /**
     * Write the lines, add-ons, discounts and tax of a priced cart onto an order.
     * Shared by create() and update() so both always store an order the same way.
     *
     * @param  array<string, mixed>  $priced  result of OrderPricingService::price()
     */
    private function persist(Order $order, array $priced, User $user): void
    {
        $calc = $priced['calc'];

        $itemIds = [];
        foreach ($priced['lines'] as $i => $line) {
            $item = $order->items()->create([
                'product_id' => $line['product']->id,
                'product_variant_id' => $line['variant']?->id,
                'product_name' => $line['product_name'],
                'variant_name' => $line['variant_name'],
                'unit_price_cents' => $line['unit_price_cents'],
                'original_unit_price_cents' => $line['price_override']['original_unit_price_cents'] ?? null,
                'price_override_reason' => $line['price_override']['reason'] ?? null,
                'price_overridden_by' => $line['price_override']['approved_by'] ?? null,
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

            if (! empty($line['price_override'])) {
                $override = $line['price_override'];
                $this->approvals->record($user, User::findOrFail($override['approved_by']), ApprovalAction::PriceOverride, $item, $override['reason']);
                Audit::record('orders', 'order.price-overridden', "Order {$order->order_number}: {$item->product_name} price changed", $order, [
                    'from_cents' => $override['original_unit_price_cents'],
                    'to_cents' => $item->unit_price_cents,
                    'reason' => $override['reason'],
                    'approved_by' => $override['approved_by'],
                ]);
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
                $this->approvals->record($user, User::findOrFail($row['approved_by']), ApprovalAction::Discount, $order, $discount->name);
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
    }
}
