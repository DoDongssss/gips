<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\BusinessDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** Orders the kitchen has finished, waiting at the counter for the customer. */
class ReadyBoardController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:order.view')];
    }

    public function __invoke(): JsonResponse
    {
        $orders = Order::query()
            ->where('business_date', BusinessDate::current())
            ->where('status', OrderStatus::Ready->value)
            ->withCount('items')
            ->orderBy('updated_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $orders->map(fn (Order $o) => [
            'id' => $o->id,
            'order_number' => $o->order_number,
            'customer_name' => $o->customer_name,
            'type' => $o->type->value,
            'payment_status' => $o->payment_status->value,
            'balance_cents' => $o->balanceCents(),
            'items_count' => $o->items_count,
            'ready_at' => $o->updated_at?->toIso8601String(),
        ])->values()]);
    }
}
