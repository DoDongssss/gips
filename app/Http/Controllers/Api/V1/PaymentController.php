<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Middleware\RequireIdempotencyKey;
use App\Http\Requests\Orders\TakePaymentRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\IdempotencyService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PaymentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:payment.take'),
            new Middleware(RequireIdempotencyKey::class),
        ];
    }

    /** POST /api/v1/orders/{order}/payments: one call can carry several payments (split). */
    public function store(
        TakePaymentRequest $request,
        Order $order,
        PaymentService $payments,
        IdempotencyService $idempotency,
    ): JsonResponse {
        $result = $idempotency->execute(
            $request->attributes->get('idempotency_key'),
            $request->user(),
            null,
            ['route' => 'orders.payments.store', 'order' => $order->id, 'data' => $request->validated()],
            function () use ($request, $order, $payments) {
                $paid = $payments->take($order, $request->validated('payments'), $request->user());

                return [201, ['data' => (new OrderResource($paid))->resolve()]];
            },
        );

        return response()->json($result['body'], $result['status'])
            ->header('Idempotent-Replayed', $result['replayed'] ? 'true' : 'false');
    }
}
