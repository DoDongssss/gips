<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Edit an unpaid order in the register cart:
 *  - cart():   the order as the cart store holds it (so it shows up in the cart again)
 *  - update(): the edited cart, priced again and saved onto the same order
 */
class OrderEditController extends Controller
{
    public function cart(Order $order): JsonResponse
    {
        if (! $this->editable($order)) {
            throw ValidationException::withMessages(['order' => 'This order can no longer be changed. It may have been paid, cancelled or sent to the kitchen.']);
        }

        $order->load(['items.modifiers', 'discounts']);
        $images = Product::with('primaryImage')->whereIn('id', $order->items->pluck('product_id'))->get()->keyBy('id');
        $position = $order->items->pluck('id')->flip();

        return response()->json(['data' => [
            'order' => ['id' => $order->id, 'order_number' => $order->order_number],
            'type' => $order->type->value,
            'customer_name' => $order->customer_name,
            'notes' => $order->notes,
            'lines' => $order->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'name' => $item->product_name,
                'image_url' => $images->get($item->product_id)?->primaryImage?->url,
                'variant_id' => $item->product_variant_id,
                'variant_name' => $item->variant_name,
                'modifier_ids' => $item->modifiers->pluck('modifier_id')->filter()->values()->all(),
                'modifier_names' => $item->modifiers->pluck('modifier_name')->all(),
                'notes' => $item->notes ?? '',
                'quantity' => $item->quantity,
                'price_override' => $item->original_unit_price_cents !== null
                    ? ['unit_price_cents' => $item->unit_price_cents, 'reason' => (string) $item->price_override_reason]
                    : null,
            ])->values()->all(),
            'discounts' => $order->discounts->map(fn ($d) => [
                'discount_id' => $d->discount_id,
                'name' => $d->name,
                'id_number' => $d->id_number ?? '',
                'item_index' => $d->order_item_id !== null ? ($position[$d->order_item_id] ?? null) : null,
            ])->values()->all(),
        ]]);
    }

    public function update(StoreOrderRequest $request, Order $order, OrderService $orders): OrderResource
    {
        return new OrderResource($orders->update($order, $request->validated(), $request->user()));
    }

    private function editable(Order $order): bool
    {
        return $order->status === OrderStatus::Open && $order->payment_status === PaymentStatus::Unpaid && $order->paid_cents === 0;
    }
}
