<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentRecordStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Support\BusinessDate;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * What the register header and the "My orders" drawer show for the signed-in cashier.
 * "since" is when the cashier opened the register (Phase 5 swaps this for the shift's opened_at).
 */
class PosSessionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:order.view')];
    }

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $businessDate = BusinessDate::current();

        $since = null;
        if ($request->filled('since')) {
            try {
                // Convert to the app timezone: Eloquent formats Carbon values in their own zone.
                $since = Carbon::parse($request->string('since')->toString())->setTimezone(config('app.timezone'));
            } catch (\Throwable) {
                $since = null;
            }
        }

        $orders = Order::query()
            ->where('created_by', $user->id)
            ->where('business_date', $businessDate)
            ->withCount('items')
            ->latest('id')
            ->limit(150)
            ->get();

        $sales = Payment::query()
            ->where('received_by', $user->id)
            ->where('status', PaymentRecordStatus::Completed->value)
            ->when(
                $since,
                fn ($q) => $q->where('paid_at', '>=', $since),
                fn ($q) => $q->whereHas('order', fn ($o) => $o->where('business_date', $businessDate)),
            );

        $unpaid = $orders->filter(fn (Order $o) => ! in_array($o->status->value, ['cancelled', 'voided'], true) && $o->balanceCents() > 0);

        return response()->json(['data' => [
            'summary' => [
                'since' => $since?->toIso8601String(),
                'sales_count' => (clone $sales)->distinct()->count('order_id'),
                'sales_cents' => (int) (clone $sales)->sum('amount_cents'),
                'unpaid_count' => $unpaid->count(),
                'unpaid_cents' => (int) $unpaid->sum(fn (Order $o) => $o->balanceCents()),
            ],
            'orders' => $orders->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'status' => $o->status->value,
                'payment_status' => $o->payment_status->value,
                'type' => $o->type->value,
                'customer_name' => $o->customer_name,
                'total_cents' => $o->total_cents,
                'paid_cents' => $o->paid_cents,
                'balance_cents' => $o->balanceCents(),
                'items_count' => $o->items_count,
                'created_at' => $o->created_at?->toIso8601String(),
            ])->values(),
        ]]);
    }
}
