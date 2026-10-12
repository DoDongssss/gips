<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Receipt;
use App\Services\Orders\OrderService;
use App\Services\Payments\ReceiptService;
use App\Support\Approvers;
use App\Support\BusinessDate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Inertia pages: one business day's orders, order detail, receipt reprint. */
class OrderController extends Controller implements HasMiddleware
{
    /** Column names a client may sort by. Anything else is ignored. */
    private const SORTABLE = ['order_number', 'status', 'payment_status', 'total_cents', 'created_at'];

    private const PER_PAGE = 20;

    public static function middleware(): array
    {
        return [new Middleware('permission:order.view')];
    }

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:30'],
            'payment_status' => ['nullable', 'string', 'max:30'],
            'channel' => ['nullable', 'string', 'max:30'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $date = $filters['date'] ?? BusinessDate::current();
        $sort = $filters['sort'] ?? null;
        $direction = ($filters['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('orders/index', [
            // Not loaded on the first visit: the page asks for it with a partial reload.
            'orders' => Inertia::optional(fn () => Order::query()
                ->where('business_date', $date)
                ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(
                    fn ($w) => $w->where('order_number', 'like', "%{$s}%")->orWhere('customer_name', 'like', "%{$s}%")
                ))
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->when($filters['payment_status'] ?? null, fn ($q, $v) => $q->where('payment_status', $v))
                ->when($filters['channel'] ?? null, fn ($q, $v) => $q->where('channel', $v))
                ->with('creator:id,name')
                ->when($sort, fn ($q) => $q->orderBy($sort, $direction)->orderByDesc('id'), fn ($q) => $q->latest('id'))
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Order $o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'channel' => $o->channel->value,
                    'type' => $o->type->value,
                    'status' => $o->status->value,
                    'payment_status' => $o->payment_status->value,
                    'customer_name' => $o->customer_name,
                    'total_cents' => $o->total_cents,
                    'paid_cents' => $o->paid_cents,
                    'cashier' => $o->creator?->name,
                    'created_at' => $o->created_at?->toIso8601String(),
                ])),
            'filters' => [
                'date' => $date,
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'channel' => $filters['channel'] ?? '',
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function show(Order $order, OrderService $orders): Response
    {
        return Inertia::render('orders/show', [
            'order' => (new OrderResource($orders->load($order)))->resolve(),
            // Managers whose PIN can approve a void, for cashiers who cannot void alone.
            'approvers' => Approvers::for(['order.void']),
        ]);
    }

    public function reprint(Order $order, Receipt $receipt, ReceiptService $receipts): RedirectResponse
    {
        abort_unless($receipt->order_id === $order->id, 404);

        $receipts->markPrinted($receipt);

        return back()->with('success', "Receipt {$receipt->receipt_number} sent to print.");
    }
}
