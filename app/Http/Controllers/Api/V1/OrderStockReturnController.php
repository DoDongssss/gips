<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Inventory\StockReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** "Return items to stock" for a voided or refunded order whose food was never made. */
class OrderStockReturnController extends Controller
{
    public function __invoke(Request $request, Order $order, StockReturnService $returns): JsonResponse
    {
        $user = $request->user();

        abort_unless($user && ($user->can('order.void') || $user->can('payment.refund')), 403);

        $voided = in_array($order->status, [OrderStatus::Voided, OrderStatus::Cancelled], true);

        if (! $voided && ! $order->refunds()->exists()) {
            throw ValidationException::withMessages(['order' => 'Stock can only be returned for a voided or refunded order.']);
        }

        $count = $returns->returnForOrder($order, $user, "Order {$order->order_number} returned to stock by {$user->name}");

        return response()->json(['data' => ['returned' => $count]]);
    }
}
