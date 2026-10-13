<?php

namespace App\Services\Reports;

use App\Enums\OrderStatus;
use App\Enums\PaymentRecordStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use App\Models\XReport;
use App\Services\Shifts\ShiftService;
use App\Support\BusinessDate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Every report number comes from here, so X, Z and the report pages always agree.
 *
 * What counts as a sale: an order of that business date that is paid (or was paid and later refunded)
 * and is not voided or cancelled. Gross = sum of order subtotals, discounts come off, and money handed
 * back that day (refunds on orders that are not voided) comes off the net. Voided orders are listed apart.
 * Money is the integer centavos stored on the orders, so "net sales" carries tax when prices include it.
 */
class ReportService
{
    /** @var array<string, string> */
    public const TYPES = [
        'daily' => 'Daily sales',
        'items' => 'Sales by item',
        'categories' => 'Sales by category',
        'hours' => 'Sales by hour',
        'cashiers' => 'Sales by cashier',
        'payments' => 'Payment methods',
        'discounts' => 'Discounts',
        'voids' => 'Voids',
        'refunds' => 'Refunds',
    ];

    public function __construct(private ShiftService $shifts) {}

    /**
     * Totals for one or more business days, optionally for one shift only.
     *
     * @return array<string, mixed>
     */
    public function summary(string $from, string $to, ?int $shiftId = null): array
    {
        $orders = $this->saleOrders($from, $to, $shiftId)->get();

        $payments = Payment::query()->with('method')
            ->whereIn('status', [PaymentRecordStatus::Completed->value, PaymentRecordStatus::Refunded->value])
            ->whereHas('order', fn (Builder $q) => $this->applySales($q, $from, $to))
            ->when($shiftId, fn (Builder $q) => $q->where('shift_id', $shiftId))
            ->get();

        $refunds = $this->refundRows($from, $to, $shiftId);

        $gross = (int) $orders->sum('subtotal_cents');
        $discounts = (int) $orders->sum('discount_cents');
        $refundTotal = (int) $refunds->sum('amount_cents');

        $voided = Order::query()->whereBetween('business_date', [$from, $to])
            ->where('status', OrderStatus::Voided->value)
            ->when($shiftId, fn (Builder $q) => $q->where('shift_id', $shiftId));

        return [
            'from' => $from,
            'to' => $to,
            'orders_count' => $orders->count(),
            'gross_sales_cents' => $gross,
            'discounts_cents' => $discounts,
            'refunds_cents' => $refundTotal,
            'net_sales_cents' => $gross - $discounts - $refundTotal,
            'tax_cents' => (int) $orders->sum('tax_cents'),
            'tips_cents' => (int) $orders->sum('tip_cents'),
            'voids_count' => (clone $voided)->count(),
            'voids_cents' => (int) (clone $voided)->sum('total_cents'),
            'payments' => $this->paymentBreakdown($payments, $refunds),
        ];
    }

    /**
     * A mid-day snapshot. Nothing is reset; it is stored so the printout can be matched later.
     *
     * @return array<string, mixed>
     */
    public function makeXReport(User $user, ?Shift $shift = null): array
    {
        $date = $shift ? $shift->business_date->toDateString() : BusinessDate::current();

        $snapshot = [
            'scope' => $shift ? 'shift' : 'day',
            'business_date' => $date,
            'generated_at' => now()->toIso8601String(),
            'generated_by' => $user->name,
            'cashier' => $shift?->user->name,
            'summary' => $this->summary($date, $date, $shift?->id),
            'cash' => $shift ? $this->shifts->cashBreakdown($shift) : null,
        ];

        XReport::create([
            'business_date' => $date,
            'shift_id' => $shift?->id,
            'generated_by' => $user->id,
            'snapshot' => $snapshot,
            'generated_at' => now(),
        ]);

        return $snapshot;
    }

    /**
     * A table for one report page: columns, rows and a totals row.
     *
     * @return array{type: string, title: string, columns: array<int, array<string, mixed>>, rows: array<int, array<string, mixed>>, totals: array<string, mixed>|null}
     */
    public function table(string $type, string $from, string $to): array
    {
        [$columns, $rows] = match ($type) {
            'items' => $this->itemRows($from, $to),
            'categories' => $this->categoryRows($from, $to),
            'hours' => $this->hourRows($from, $to),
            'cashiers' => $this->cashierRows($from, $to),
            'payments' => $this->paymentRows($from, $to),
            'discounts' => $this->discountRows($from, $to),
            'voids' => $this->voidRows($from, $to),
            'refunds' => $this->refundTableRows($from, $to),
            default => $this->dailyRows($from, $to),
        };

        $totals = null;
        $summed = array_filter($columns, fn (array $c) => $c['sum'] ?? false);
        if ($summed && $rows) {
            $totals = [$columns[0]['key'] => 'Total'];
            foreach ($summed as $c) {
                $totals[$c['key']] = array_sum(array_column($rows, $c['key']));
            }
        }

        return [
            'type' => $type,
            'title' => self::TYPES[$type] ?? self::TYPES['daily'],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /** Orders that count as sales (see the class note). */
    private function applySales(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('business_date', [$from, $to])
            ->whereIn('payment_status', [PaymentStatus::Paid->value, PaymentStatus::Refunded->value])
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Voided->value]);
    }

    /** @return Builder<Order> */
    private function saleOrders(string $from, string $to, ?int $shiftId = null): Builder
    {
        return $this->applySales(Order::query(), $from, $to)
            ->when($shiftId, fn (Builder $q) => $q->where('shift_id', $shiftId));
    }

    /** @return Collection<int, Refund> */
    private function refundRows(string $from, string $to, ?int $shiftId = null): Collection
    {
        return Refund::query()->with('payment.method', 'order', 'refundedBy')
            ->where('status', RefundStatus::Completed->value)
            ->whereBetween('business_date', [$from, $to])
            ->whereHas('order', fn (Builder $q) => $q->where('status', '!=', OrderStatus::Voided->value))
            ->when($shiftId, fn (Builder $q) => $q->where('shift_id', $shiftId))
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  Collection<int, Payment>  $payments
     * @param  Collection<int, Refund>  $refunds
     * @return array<int, array<string, mixed>>
     */
    private function paymentBreakdown(Collection $payments, Collection $refunds): array
    {
        $rows = [];

        foreach ($payments as $payment) {
            $method = $payment->method;
            $rows[$method->code] ??= [
                'code' => $method->code, 'name' => $method->name, 'type' => $method->type->value,
                'count' => 0, 'amount_cents' => 0, 'refunds_cents' => 0, 'net_cents' => 0,
            ];
            $rows[$method->code]['count']++;
            $rows[$method->code]['amount_cents'] += $payment->amount_cents;
        }

        foreach ($refunds as $refund) {
            $code = $refund->payment->method->code;
            if (isset($rows[$code])) {
                $rows[$code]['refunds_cents'] += $refund->amount_cents;
            } else {
                // A refund today on a payment taken on an earlier day.
                $method = $refund->payment->method;
                $rows[$code] = [
                    'code' => $code, 'name' => $method->name, 'type' => $method->type->value,
                    'count' => 0, 'amount_cents' => 0, 'refunds_cents' => $refund->amount_cents, 'net_cents' => 0,
                ];
            }
        }

        foreach ($rows as &$row) {
            $row['net_cents'] = $row['amount_cents'] - $row['refunds_cents'];
        }

        return array_values($rows);
    }

    private function col(string $key, string $label, string $type = 'text', bool $sum = false): array
    {
        return ['key' => $key, 'label' => $label, 'type' => $type, 'sum' => $sum];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function dailyRows(string $from, string $to): array
    {
        $orders = $this->saleOrders($from, $to)->get()->groupBy(fn (Order $o) => $o->business_date->toDateString());
        $refunds = $this->refundRows($from, $to)->groupBy(fn (Refund $r) => $r->business_date->toDateString());

        $rows = collect($orders->keys())->merge($refunds->keys())->unique()->sort()->map(function (string $date) use ($orders, $refunds) {
            $day = $orders->get($date, collect());
            $gross = (int) $day->sum('subtotal_cents');
            $discounts = (int) $day->sum('discount_cents');
            $refunded = (int) $refunds->get($date, collect())->sum('amount_cents');

            return [
                'date' => $date,
                'orders' => $day->count(),
                'gross' => $gross,
                'discounts' => $discounts,
                'refunds' => $refunded,
                'net' => $gross - $discounts - $refunded,
                'tax' => (int) $day->sum('tax_cents'),
            ];
        })->values()->all();

        return [[
            $this->col('date', 'Date'),
            $this->col('orders', 'Orders', 'int', true),
            $this->col('gross', 'Gross sales', 'money', true),
            $this->col('discounts', 'Discounts', 'money', true),
            $this->col('refunds', 'Refunds', 'money', true),
            $this->col('net', 'Net sales', 'money', true),
            $this->col('tax', 'Tax', 'money', true),
        ], $rows];
    }

    /** Order lines of sale orders, joined to products and categories. */
    private function lineQuery(string $from, string $to): \Illuminate\Database\Query\Builder
    {
        return DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->leftJoin('products as p', 'p.id', '=', 'oi.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->whereBetween('o.business_date', [$from, $to])
            ->whereIn('o.payment_status', [PaymentStatus::Paid->value, PaymentStatus::Refunded->value])
            ->whereNotIn('o.status', [OrderStatus::Cancelled->value, OrderStatus::Voided->value])
            ->where('oi.status', '!=', 'voided');
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function itemRows(string $from, string $to): array
    {
        $rows = $this->lineQuery($from, $to)
            ->selectRaw('oi.product_name as item, oi.variant_name as variant, SUM(oi.quantity) as quantity, SUM(oi.line_total_cents) as net')
            ->groupBy('oi.product_name', 'oi.variant_name')
            ->orderByDesc('net')
            ->get()
            ->map(fn ($r) => ['item' => $r->item, 'variant' => $r->variant ?? '', 'quantity' => (int) $r->quantity, 'net' => (int) $r->net])
            ->all();

        return [[
            $this->col('item', 'Item'),
            $this->col('variant', 'Size'),
            $this->col('quantity', 'Quantity', 'int', true),
            $this->col('net', 'Sales', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function categoryRows(string $from, string $to): array
    {
        $rows = $this->lineQuery($from, $to)
            ->selectRaw("COALESCE(c.name, 'Uncategorized') as category, SUM(oi.quantity) as quantity, SUM(oi.line_total_cents) as net")
            ->groupBy('c.name')
            ->orderByDesc('net')
            ->get()
            ->map(fn ($r) => ['category' => $r->category, 'quantity' => (int) $r->quantity, 'net' => (int) $r->net])
            ->all();

        return [[
            $this->col('category', 'Category'),
            $this->col('quantity', 'Quantity', 'int', true),
            $this->col('net', 'Sales', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function hourRows(string $from, string $to): array
    {
        $byHour = $this->saleOrders($from, $to)->get()->groupBy(fn (Order $o) => (int) $o->created_at->format('G'));

        $rows = $byHour->sortKeys()->map(fn (Collection $orders, int $hour) => [
            'hour' => sprintf('%02d:00 – %02d:59', $hour, $hour),
            'orders' => $orders->count(),
            'net' => (int) $orders->sum('subtotal_cents') - (int) $orders->sum('discount_cents'),
        ])->values()->all();

        return [[
            $this->col('hour', 'Hour'),
            $this->col('orders', 'Orders', 'int', true),
            $this->col('net', 'Sales (before refunds)', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function cashierRows(string $from, string $to): array
    {
        $orders = $this->saleOrders($from, $to)->with('creator:id,name')->get()->groupBy('created_by');

        $rows = $orders->map(function (Collection $group) {
            $gross = (int) $group->sum('subtotal_cents');
            $discounts = (int) $group->sum('discount_cents');

            return [
                'cashier' => $group->first()->creator?->name ?? 'Unknown',
                'orders' => $group->count(),
                'gross' => $gross,
                'discounts' => $discounts,
                'net' => $gross - $discounts,
                'tips' => (int) $group->sum('tip_cents'),
            ];
        })->sortByDesc('net')->values()->all();

        return [[
            $this->col('cashier', 'Cashier'),
            $this->col('orders', 'Orders', 'int', true),
            $this->col('gross', 'Gross sales', 'money', true),
            $this->col('discounts', 'Discounts', 'money', true),
            $this->col('net', 'Sales (before refunds)', 'money', true),
            $this->col('tips', 'Tips', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function paymentRows(string $from, string $to): array
    {
        $summary = $this->summary($from, $to);

        $rows = array_map(fn (array $p) => [
            'method' => $p['name'],
            'count' => $p['count'],
            'amount' => $p['amount_cents'],
            'refunds' => $p['refunds_cents'],
            'net' => $p['net_cents'],
        ], $summary['payments']);

        return [[
            $this->col('method', 'Method'),
            $this->col('count', 'Payments', 'int', true),
            $this->col('amount', 'Collected', 'money', true),
            $this->col('refunds', 'Refunded', 'money', true),
            $this->col('net', 'Net', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function discountRows(string $from, string $to): array
    {
        $rows = DB::table('order_discounts as od')
            ->join('orders as o', 'o.id', '=', 'od.order_id')
            ->whereBetween('o.business_date', [$from, $to])
            ->whereIn('o.payment_status', [PaymentStatus::Paid->value, PaymentStatus::Refunded->value])
            ->whereNotIn('o.status', [OrderStatus::Cancelled->value, OrderStatus::Voided->value])
            ->selectRaw('od.name as discount, COUNT(*) as times, SUM(od.amount_cents) as amount')
            ->groupBy('od.name')
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($r) => ['discount' => $r->discount, 'times' => (int) $r->times, 'amount' => (int) $r->amount])
            ->all();

        return [[
            $this->col('discount', 'Discount'),
            $this->col('times', 'Times used', 'int', true),
            $this->col('amount', 'Amount', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function voidRows(string $from, string $to): array
    {
        $orders = Order::query()->with('creator:id,name')
            ->whereBetween('business_date', [$from, $to])
            ->where('status', OrderStatus::Voided->value)
            ->orderBy('business_date')->orderBy('id')->get();

        $history = OrderStatusHistory::query()->with('user:id,name')
            ->whereIn('order_id', $orders->pluck('id'))
            ->where('to_status', OrderStatus::Voided->value)
            ->get()->keyBy('order_id');

        $rows = $orders->map(fn (Order $o) => [
            'date' => $o->business_date->toDateString(),
            'order' => $o->order_number,
            'cashier' => $o->creator?->name ?? 'Unknown',
            'voided_by' => $history->get($o->id)?->user?->name ?? '',
            'reason' => $history->get($o->id)?->note ?? '',
            'total' => $o->total_cents,
        ])->all();

        return [[
            $this->col('date', 'Date'),
            $this->col('order', 'Order'),
            $this->col('cashier', 'Cashier'),
            $this->col('voided_by', 'Voided by'),
            $this->col('reason', 'Reason'),
            $this->col('total', 'Order total', 'money', true),
        ], $rows];
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function refundTableRows(string $from, string $to): array
    {
        $rows = $this->refundRows($from, $to)->map(fn (Refund $r) => [
            'date' => $r->business_date->toDateString(),
            'order' => $r->order->order_number,
            'method' => $r->payment->method->name,
            'reason' => $r->reason,
            'refunded_by' => $r->refundedBy?->name ?? '',
            'amount' => $r->amount_cents,
        ])->all();

        return [[
            $this->col('date', 'Date'),
            $this->col('order', 'Order'),
            $this->col('method', 'Method'),
            $this->col('reason', 'Reason'),
            $this->col('refunded_by', 'Refunded by'),
            $this->col('amount', 'Amount', 'money', true),
        ], $rows];
    }
}
