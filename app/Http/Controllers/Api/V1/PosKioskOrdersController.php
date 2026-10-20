<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

/**
 * Kiosk orders waiting at the counter. They are saved under the kiosk system user, so they never
 * appear in a cashier's own "my orders". Any signed-in cashier can see and take payment on them.
 */
class PosKioskOrdersController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $orders = Order::query()
            ->where('channel', 'kiosk')
            ->whereNotIn('status', ['cancelled', 'voided'])
            ->whereColumn('paid_cents', '<', 'total_cents')
            ->withSum('items as items_total', 'quantity')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'status' => $o->status->value,
                'payment_status' => $o->payment_status->value,
                'type' => $o->type->value,
                'customer_name' => $o->customer_name,
                'total_cents' => $o->total_cents,
                'paid_cents' => $o->paid_cents,
                'balance_cents' => max(0, $o->total_cents - $o->paid_cents),
                'items_count' => (int) $o->items_total,
                'created_at' => $o->created_at?->toIso8601String(),
                'channel' => 'kiosk',
                'requires_verification' => (bool) $o->requires_verification,
            ]);

        return response()->json(['data' => $orders]);
    }
}
