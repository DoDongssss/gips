<?php

namespace App\Http\Controllers\Orders;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Receipt;
use App\Services\Orders\OrderIndexQuery;
use App\Services\Orders\OrderService;
use App\Services\Payments\ReceiptService;
use App\Support\Approvers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Inertia pages: orders list, order detail, receipt reprint. */
class OrderController extends Controller implements HasMiddleware
{
    private const PER_PAGE = 20;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:order.view'),
            new Middleware('permission:payment.take', only: ['reprint']),
        ];
    }

    public function index(Request $request, OrderIndexQuery $queryBuilder): Response
    {
        $filters = $queryBuilder->filters($request);

        return Inertia::render('orders/index', [
            'orders' => Inertia::optional(function () use ($queryBuilder, $filters) {
                $query = $queryBuilder->sorted($queryBuilder->baseQuery($filters), $filters);

                return $query
                    ->with('creator:id,name')
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
                        'requires_verification' => $o->requires_verification,
                        'cashier' => $o->creator?->name,
                        'created_at' => $o->created_at?->toIso8601String(),
                    ]);
            }),
            'summary' => Inertia::optional(fn () => $queryBuilder->summary($filters)),
            'filters' => [
                'date' => $filters['date'],
                'date_end' => $filters['date_end'],
                'search' => $filters['search'],
                'status' => $filters['status'],
                'payment_status' => $filters['payment_status'],
                'channel' => $filters['channel'],
                'type' => $filters['type'],
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
                'highlight' => $filters['highlight'],
            ],
        ]);
    }

    public function export(Request $request, OrderIndexQuery $queryBuilder): StreamedResponse
    {
        $filters = $queryBuilder->filters($request);
        $rows = $queryBuilder
            ->sorted($queryBuilder->baseQuery($filters), $filters)
            ->with('creator:id,name')
            ->get();

        $filename = 'orders-'.$filters['date'];
        if ($filters['date_end'] !== $filters['date']) {
            $filename .= '_'.$filters['date_end'];
        }
        $filename .= '.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Order', 'Business date', 'Channel', 'Type', 'Status', 'Payment', 'Customer',
                'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Cashier', 'Created at',
            ]);

            foreach ($rows as $order) {
                fputcsv($out, [
                    $order->order_number,
                    $order->business_date->toDateString(),
                    $order->channel->value,
                    $order->type->value,
                    $order->status->value,
                    $order->payment_status->value,
                    $order->customer_name ?? '',
                    (string) $order->subtotal_cents,
                    (string) $order->discount_cents,
                    (string) $order->tax_cents,
                    (string) $order->total_cents,
                    (string) $order->paid_cents,
                    $order->creator?->name ?? '',
                    $order->created_at?->toIso8601String() ?? '',
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function show(Request $request, Order $order, OrderService $orders): Response
    {
        return Inertia::render('orders/show', [
            'order' => (new OrderResource($orders->load($order)))->resolve(),
            'approvers' => Approvers::for(['order.void']),
            'refund_approvers' => Approvers::for(['payment.refund']),
            'can' => [
                'void' => $request->user()->can('void', $order),
                'refund' => $request->user()->can('refund', $order),
                'edit_in_pos' => $request->user()->can('order.create')
                    && $order->status === OrderStatus::Open
                    && $order->payment_status === PaymentStatus::Unpaid
                    && $order->paid_cents === 0,
            ],
        ]);
    }

    public function reprint(Order $order, Receipt $receipt, ReceiptService $receipts): RedirectResponse
    {
        abort_unless($receipt->order_id === $order->id, 404);

        $receipts->markPrinted($receipt);

        return back()->with('success', "Receipt {$receipt->receipt_number} sent to print.");
    }
}
