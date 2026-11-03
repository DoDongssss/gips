<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Middleware\RequireIdempotencyKey;
use App\Http\Requests\Orders\RefundRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\IdempotencyService;
use App\Services\Orders\OrderService;
use App\Services\Payments\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RefundController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:order.view'),
            new Middleware(RequireIdempotencyKey::class),
        ];
    }

    /** POST /api/v1/orders/{order}/refunds: refund part or all of one payment. */
    public function store(
        RefundRequest $request,
        Order $order,
        RefundService $refunds,
        OrderService $orders,
        IdempotencyService $idempotency,
    ): JsonResponse {
        $result = $idempotency->execute(
            $request->attributes->get('idempotency_key'),
            $request->user(),
            null,
            ['route' => 'orders.refunds.store', 'order' => $order->id, 'data' => $request->validated()],
            function () use ($request, $order, $refunds, $orders) {
                $payment = Payment::where('order_id', $order->id)->findOrFail($request->validated('payment_id'));

                $refunds->refund(
                    $order,
                    $payment,
                    (int) $request->validated('amount_cents'),
                    $request->validated('reason'),
                    $request->user(),
                    $request->validated('approval'),
                );

                return [201, ['data' => (new OrderResource($orders->load($order->refresh())))->resolve()]];
            },
        );

        return response()->json($result['body'], $result['status'])
            ->header('Idempotent-Replayed', $result['replayed'] ? 'true' : 'false');
    }
}
