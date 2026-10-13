<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApprovalAction;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Middleware\RequireIdempotencyKey;
use App\Http\Requests\Orders\OrderActionRequest;
use App\Http\Requests\Orders\PriceOrderRequest;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\IdempotencyService;
use App\Services\Orders\ApprovalService;
use App\Services\Orders\OrderPricingService;
use App\Services\Orders\OrderService;
use App\Services\Orders\OrderStatusService;
use App\Services\Payments\RefundService;
use App\Support\Audit;
use App\Support\BusinessDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:order.create', only: ['preview', 'store']),
            new Middleware(RequireIdempotencyKey::class, only: ['store']),
            new Middleware('permission:order.view', only: ['show', 'lookup', 'void']),
            new Middleware('permission:order.update', only: ['confirm', 'cancel', 'complete']),
        ];
    }

    /** Price a cart without saving anything. The cart shows these totals. */
    public function preview(PriceOrderRequest $request, OrderPricingService $pricing): JsonResponse
    {
        $priced = $pricing->price($request->validated(), $request->user(), enforceApproval: false);

        return response()->json(['data' => $priced['summary']]);
    }

    public function store(
        StoreOrderRequest $request,
        OrderService $orders,
        IdempotencyService $idempotency,
    ): JsonResponse {
        $result = $idempotency->execute(
            $request->attributes->get('idempotency_key'),
            $request->user(),
            null,
            ['route' => 'orders.store', 'user' => $request->user()->id, 'data' => $request->validated()],
            function () use ($request, $orders) {
                $order = $orders->create($request->validated(), $request->user());

                return [201, ['data' => (new OrderResource($order))->resolve()]];
            },
        );

        return response()->json($result['body'], $result['status'])
            ->header('Idempotent-Replayed', $result['replayed'] ? 'true' : 'false');
    }

    public function show(Order $order, OrderService $orders): JsonResponse
    {
        return $this->respond($orders->load($order));
    }

    /** The cashier pulls up today's order by its pickup number, for example A-023. */
    public function lookup(string $number, OrderService $orders): JsonResponse
    {
        $order = Order::where('business_date', BusinessDate::current())
            ->where('order_number', strtoupper(trim($number)))
            ->firstOrFail();

        return $this->respond($orders->load($order));
    }

    public function confirm(Request $request, Order $order, OrderStatusService $statuses, OrderService $orders): JsonResponse
    {
        $order = $statuses->transition($order, OrderStatus::Confirmed, $request->user());

        return $this->respond($orders->load($order));
    }

    public function complete(Request $request, Order $order, OrderStatusService $statuses, OrderService $orders): JsonResponse
    {
        $order = $statuses->transition($order, OrderStatus::Completed, $request->user());

        return $this->respond($orders->load($order));
    }

    /** Cancel an UNPAID order. Paid orders have to be voided. */
    public function cancel(OrderActionRequest $request, Order $order, OrderStatusService $statuses, OrderService $orders): JsonResponse
    {
        $order = $statuses->transition($order, OrderStatus::Cancelled, $request->user(), $request->validated('reason'));
        Audit::record('orders', 'order.cancelled', "Order {$order->order_number} cancelled", $order, [
            'reason' => $request->validated('reason'),
        ]);

        return $this->respond($orders->load($order));
    }

    /** Void needs order.void, or a manager's PIN when a cashier asks. */
    public function void(
        OrderActionRequest $request,
        Order $order,
        ApprovalService $approvals,
        OrderStatusService $statuses,
        RefundService $refunds,
        OrderService $orders,
    ): JsonResponse {
        $user = $request->user();
        $approver = $approvals->resolve($user, $request->validated('approval'), 'order.void');
        $reason = $request->validated('reason');

        $order = DB::transaction(function () use ($order, $user, $approver, $reason, $statuses, $refunds, $approvals) {
            $order = $statuses->transition($order, OrderStatus::Voided, $user, $reason);
            $returned = $refunds->refundAllForVoid($order, $user, $approver, $reason);
            $approvals->record($user, $approver, ApprovalAction::Void, $order, $reason);

            Audit::record('orders', 'order.voided', "Order {$order->order_number} voided", $order, [
                'reason' => $reason,
                'total_cents' => $order->total_cents,
                'paid_cents' => $order->paid_cents,
                'refunded_cents' => $returned->sum('amount_cents'),
                'approved_by' => $approver->id,
            ]);

            return $order;
        });

        return $this->respond($orders->load($order));
    }

    private function respond(Order $order): JsonResponse
    {
        return response()->json(['data' => (new OrderResource($order))->resolve()]);
    }
}
