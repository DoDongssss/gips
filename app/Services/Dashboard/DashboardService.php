<?php

namespace App\Services\Dashboard;

use App\Enums\ShiftStatus;
use App\Models\Shift;
use App\Services\Inventory\CostReportService;
use App\Services\Reports\ReportService;
use App\Services\Shifts\ShiftService;
use App\Support\BusinessDate;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only numbers for the dashboard. Everything is money in centavos.
 *
 * A sale is whatever ReportService counts as a sale: paid or refunded, not cancelled or voided.
 * Gross is the order subtotal, discounts come off, and completed refunds on that business date
 * come off the net. Charts use the same orders. Live kitchen, shifts, inventory, and kiosk stay here.
 */
class DashboardService
{
    /** Order-level sales before refunds, matching ReportService daily and cashier rows. */
    private const SALE_CENTS = '(orders.subtotal_cents - orders.discount_cents)';

    public function __construct(
        private ReportService $reports,
        private CostReportService $costReports,
        private ShiftService $shifts,
    ) {}

    public const RANGES = ['today', 'yesterday', '7d', '30d', 'month'];

    /** @return array{key:string,from:Carbon,to:Carbon,prev_from:Carbon,prev_to:Carbon,days:int,label:string} */
    public function range(?string $key): array
    {
        $key = in_array($key, self::RANGES, true) ? $key : 'today';
        $today = Carbon::parse(BusinessDate::current())->startOfDay();

        [$from, $to, $label] = match ($key) {
            'yesterday' => [$today->copy()->subDay(), $today->copy()->subDay(), 'Yesterday'],
            '7d' => [$today->copy()->subDays(6), $today->copy(), 'Last 7 days'],
            '30d' => [$today->copy()->subDays(29), $today->copy(), 'Last 30 days'],
            'month' => [$today->copy()->startOfMonth(), $today->copy(), 'This month'],
            default => [$today->copy(), $today->copy(), 'Today'],
        };

        $days = (int) $from->diffInDays($to) + 1;

        return [
            'key' => $key, 'from' => $from, 'to' => $to, 'days' => $days, 'label' => $label,
            'prev_from' => $from->copy()->subDays($days), 'prev_to' => $from->copy()->subDay(),
        ];
    }

    // ---------------------------------------------------------------- sales

    private function sold(CarbonInterface $from, CarbonInterface $to): Builder
    {
        return DB::table('orders')
            ->whereBetween('orders.business_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('orders.payment_status', ['paid', 'refunded'])
            ->whereNotIn('orders.status', ['cancelled', 'voided']);
    }

    /** KPI block for one period. The figures are ReportService's, under the dashboard's field names. */
    public function summary(CarbonInterface $from, CarbonInterface $to): array
    {
        $report = $this->reports->summary($from->toDateString(), $to->toDateString());
        $orders = (int) $report['orders_count'];
        $net = (int) $report['net_sales_cents'];

        $items = (int) DB::table('order_items')
            ->joinSub($this->sold($from, $to)->select('orders.id'), 's', 's.id', '=', 'order_items.order_id')
            ->where('order_items.status', '!=', 'voided')
            ->sum('order_items.quantity');

        return [
            'orders' => $orders,
            'gross_cents' => (int) $report['gross_sales_cents'],
            'net_cents' => $net,
            'discount_cents' => (int) $report['discounts_cents'],
            'tax_cents' => (int) $report['tax_cents'],
            'tip_cents' => (int) $report['tips_cents'],
            'refund_cents' => (int) $report['refunds_cents'],
            'refund_count' => (int) $report['refunds_count'],
            'items' => $items,
            'avg_order_cents' => $orders > 0 ? (int) round($net / $orders) : 0,
            'voided' => (int) $report['voids_count'],
            'cancelled' => (int) DB::table('orders')->whereBetween('business_date', [$from->toDateString(), $to->toDateString()])->where('status', 'cancelled')->count(),
        ];
    }

    /**
     * Sales over time. A single day is shown by hour (0-23), longer ranges by day.
     * Returns [{label, cents, orders}], with the previous period lined up by position.
     */
    public function trend(array $r): array
    {
        $cents = self::SALE_CENTS;

        if ($r['days'] === 1) {
            $hour = $this->hourExpr('orders.created_at');
            $now = $this->bucketHours($this->sold($r['from'], $r['to'])
                ->selectRaw("$hour as h, COUNT(*) as n, COALESCE(SUM($cents),0) as cents")->groupByRaw($hour)->get());
            $prev = $this->bucketHours($this->sold($r['prev_from'], $r['prev_to'])
                ->selectRaw("$hour as h, COUNT(*) as n, COALESCE(SUM($cents),0) as cents")->groupByRaw($hour)->get());

            $out = [];
            for ($h = 0; $h < 24; $h++) {
                $out[] = ['label' => $this->hourLabel($h), 'cents' => $now[$h]['cents'], 'orders' => $now[$h]['n'], 'prev_cents' => $prev[$h]['cents']];
            }

            return ['unit' => 'hour', 'points' => $out];
        }

        $byDay = fn (CarbonInterface $a, CarbonInterface $b) => $this->sold($a, $b)
            ->selectRaw("orders.business_date as d, COUNT(*) as n, COALESCE(SUM($cents),0) as cents")
            ->groupBy('orders.business_date')->get()->keyBy(fn ($x) => substr((string) $x->d, 0, 10));

        $now = $byDay($r['from'], $r['to']);
        $prev = $byDay($r['prev_from'], $r['prev_to']);
        $refundsNow = $this->refundsByDate($r['from'], $r['to']);
        $refundsPrev = $this->refundsByDate($r['prev_from'], $r['prev_to']);
        $out = [];

        for ($i = 0; $i < $r['days']; $i++) {
            $day = $r['from']->copy()->addDays($i);
            $before = $r['prev_from']->copy()->addDays($i)->toDateString();
            $out[] = [
                'label' => $day->format('M j'),
                'cents' => (int) ($now[$day->toDateString()]->cents ?? 0) - ($refundsNow[$day->toDateString()] ?? 0),
                'orders' => (int) ($now[$day->toDateString()]->n ?? 0),
                'prev_cents' => (int) ($prev[$before]->cents ?? 0) - ($refundsPrev[$before] ?? 0),
            ];
        }

        return ['unit' => 'day', 'points' => $out];
    }

    /** Orders per hour of day across the range: when the shop is busy. */
    public function busyHours(array $r): array
    {
        $hour = $this->hourExpr('orders.created_at');
        $rows = $this->bucketHours($this->sold($r['from'], $r['to'])
            ->selectRaw("$hour as h, COUNT(*) as n, 0 as cents")->groupByRaw($hour)->get());

        return array_map(fn ($h) => ['hour' => $h, 'label' => $this->hourLabel($h), 'orders' => $rows[$h]['n']], range(0, 23));
    }

    public function paymentMethods(array $r): array
    {
        $payments = $this->reports->summary($r['from']->toDateString(), $r['to']->toDateString())['payments'];

        return array_map(fn (array $payment) => [
            'name' => $payment['name'],
            'type' => $payment['type'],
            'count' => $payment['count'],
            'cents' => $payment['net_cents'],
        ], $payments);
    }

    /** Sales split by channel (pos, kiosk, ...) and by order type (dine_in, takeout, ...). */
    public function split(array $r, string $column): array
    {
        $cents = self::SALE_CENTS;

        return $this->sold($r['from'], $r['to'])
            ->groupBy("orders.$column")->orderByRaw("SUM($cents) desc")
            ->get(["orders.$column as k", DB::raw('COUNT(*) as count'), DB::raw("SUM($cents) as cents")])
            ->map(fn ($x) => ['key' => $x->k, 'count' => (int) $x->count, 'cents' => (int) $x->cents])->all();
    }

    /** Best sellers, by quantity and by revenue. */
    public function topProducts(array $r): array
    {
        $base = fn () => DB::table('order_items as oi')
            ->joinSub($this->sold($r['from'], $r['to'])->select('orders.id'), 's', 's.id', '=', 'oi.order_id')
            ->where('oi.status', '!=', 'voided')
            ->groupBy('oi.product_id', 'oi.product_name')
            ->select(['oi.product_id', 'oi.product_name as name', DB::raw('SUM(oi.quantity) as qty'), DB::raw('SUM(oi.line_total_cents) as cents')])
            ->limit(8);

        $map = fn ($x) => ['id' => (int) $x->product_id, 'name' => $x->name, 'qty' => (int) $x->qty, 'cents' => (int) $x->cents];

        return [
            'by_quantity' => $base()->orderByRaw('SUM(oi.quantity) desc')->get()->map($map)->all(),
            'by_revenue' => $base()->orderByRaw('SUM(oi.line_total_cents) desc')->get()->map($map)->all(),
        ];
    }

    public function categories(array $r): array
    {
        return DB::table('order_items as oi')
            ->joinSub($this->sold($r['from'], $r['to'])->select('orders.id'), 's', 's.id', '=', 'oi.order_id')
            ->join('products as p', 'p.id', '=', 'oi.product_id')
            ->join('categories as c', 'c.id', '=', 'p.category_id')
            ->where('oi.status', '!=', 'voided')
            ->groupBy('c.id', 'c.name')->orderByRaw('SUM(oi.line_total_cents) desc')->limit(8)
            ->get(['c.name', DB::raw('SUM(oi.quantity) as qty'), DB::raw('SUM(oi.line_total_cents) as cents')])
            ->map(fn ($x) => ['name' => $x->name, 'qty' => (int) $x->qty, 'cents' => (int) $x->cents])->all();
    }

    /** Sales per staff member (who rang the order up). */
    public function staff(array $r): array
    {
        $cents = self::SALE_CENTS;

        return $this->sold($r['from'], $r['to'])
            ->join('users as u', 'u.id', '=', 'orders.created_by')
            ->groupBy('u.id', 'u.name')->orderByRaw("SUM($cents) desc")->limit(6)
            ->get(['u.name', DB::raw('COUNT(*) as orders'), DB::raw("SUM($cents) as cents")])
            ->map(fn ($x) => ['name' => $x->name, 'orders' => (int) $x->orders, 'cents' => (int) $x->cents])->all();
    }

    // ----------------------------------------------------------- live (today)

    /** What is happening right now. Always about today, whatever range is chosen. */
    public function live(): array
    {
        $today = BusinessDate::current();
        $statuses = DB::table('orders')->where('business_date', $today)
            ->whereIn('status', ['open', 'confirmed', 'preparing', 'ready'])
            ->groupBy('status')->get(['status', DB::raw('COUNT(*) as n')])->pluck('n', 'status');

        $unpaid = DB::table('orders')->where('business_date', $today)
            ->whereIn('payment_status', ['unpaid', 'partial'])->whereNotIn('status', ['cancelled', 'voided'])
            ->selectRaw('COUNT(*) as n, COALESCE(SUM(total_cents - paid_cents),0) as due')->first();

        $kitchen = ['tickets' => 0, 'oldest_minutes' => null, 'stations' => []];
        if ($this->hasTables('kds_tickets', 'stations')) {
            $rows = DB::table('kds_tickets as t')->join('stations as s', 's.id', '=', 't.station_id')
                ->whereIn('t.status', ['new', 'preparing'])
                ->groupBy('s.id', 's.name')->get(['s.name', DB::raw('COUNT(*) as n'), DB::raw('MIN(t.fired_at) as oldest')]);

            $oldest = $rows->pluck('oldest')->filter()->min();
            $kitchen = [
                'tickets' => (int) $rows->sum('n'),
                'oldest_minutes' => $oldest ? (int) max(0, Carbon::parse($oldest)->diffInMinutes(now())) : null,
                'stations' => $rows->map(fn ($x) => ['name' => $x->name, 'count' => (int) $x->n])->all(),
            ];
        }

        return [
            'as_of' => now()->toIso8601String(),
            'pipeline' => [
                'open' => (int) ($statuses['open'] ?? 0), 'confirmed' => (int) ($statuses['confirmed'] ?? 0),
                'preparing' => (int) ($statuses['preparing'] ?? 0), 'ready' => (int) ($statuses['ready'] ?? 0),
            ],
            'unpaid' => ['count' => (int) $unpaid->n, 'due_cents' => (int) $unpaid->due],
            'kitchen' => $kitchen,
            'recent' => $this->recentOrders(),
        ];
    }

    private function recentOrders(): array
    {
        return DB::table('orders as o')
            ->leftJoin('users as u', 'u.id', '=', 'o.created_by')
            ->where('o.business_date', BusinessDate::current())
            ->orderByDesc('o.id')->limit(10)
            ->get(['o.id', 'o.order_number', 'o.channel', 'o.type', 'o.status', 'o.payment_status', 'o.total_cents', 'o.customer_name', 'o.created_at', 'u.name as cashier',
                DB::raw('(select COALESCE(SUM(quantity),0) from order_items where order_items.order_id = o.id and order_items.status != \'voided\') as items')])
            ->map(fn ($x) => [
                'id' => (int) $x->id, 'number' => $x->order_number, 'channel' => $x->channel, 'type' => $x->type,
                'status' => $x->status, 'payment_status' => $x->payment_status, 'total_cents' => (int) $x->total_cents,
                'customer' => $x->customer_name, 'cashier' => $x->cashier, 'items' => (int) $x->items,
                'at' => $x->created_at ? Carbon::parse($x->created_at)->toIso8601String() : null,
            ])->all();
    }

    // ------------------------------------------------------------- cash / shifts

    /** Open drawers with expected cash from ShiftService (matches close count). $userId limits it to one cashier. */
    public function shifts(?int $userId): array
    {
        $open = Shift::query()
            ->with('user:id,name')
            ->where('status', ShiftStatus::Open)
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->orderBy('opened_at')
            ->get();

        $rows = [];
        foreach ($open as $shift) {
            $cash = $this->shifts->cashBreakdown($shift);

            $rows[] = [
                'id' => $shift->id,
                'cashier' => $shift->user?->name ?? '',
                'opened_at' => $shift->opened_at->toIso8601String(),
                'opening_cents' => $cash['opening_cents'],
                'cash_sales_cents' => $cash['cash_sales_cents'],
                'cash_tips_cents' => $cash['cash_tips_cents'],
                'cash_in_cents' => $cash['cash_in_cents'],
                'cash_out_cents' => $cash['cash_out_cents'],
                'cash_refunds_cents' => $cash['cash_refunds_cents'],
                'expected_cents' => $cash['expected_cents'],
            ];
        }

        $closed = DB::table('shifts as s')->join('users as u', 'u.id', '=', 's.user_id')
            ->where('s.status', 'closed')->whereDate('s.closed_at', BusinessDate::current())
            ->when($userId, fn ($q) => $q->where('s.user_id', $userId))
            ->orderByDesc('s.closed_at')->limit(5)
            ->get(['s.id', 'u.name', 's.closed_at', 's.variance_cents'])
            ->map(fn ($x) => ['id' => (int) $x->id, 'cashier' => $x->name, 'closed_at' => Carbon::parse($x->closed_at)->toIso8601String(), 'variance_cents' => $x->variance_cents === null ? null : (int) $x->variance_cents])->all();

        return ['open' => $rows, 'closed_today' => $closed];
    }

    // -------------------------------------------------------------- inventory

    public function inventory(array $r): array
    {
        $low = DB::table('ingredients as i')
            ->join('stock_levels as sl', 'sl.ingredient_id', '=', 'i.id')
            ->join('units as u', 'u.id', '=', 'i.base_unit_id')
            ->where('i.is_active', true)->whereNull('i.deleted_at')
            ->where('i.reorder_level', '>', 0)->whereColumn('sl.quantity', '<=', 'i.reorder_level')
            ->orderBy('sl.quantity')
            ->get(['i.id', 'i.name', 'u.abbreviation as unit', 'sl.quantity', 'i.reorder_level']);

        $value = DB::table('ingredients as i')->join('stock_levels as sl', 'sl.ingredient_id', '=', 'i.id')
            ->where('i.is_active', true)->whereNull('i.deleted_at')
            ->selectRaw('COALESCE(SUM(CASE WHEN sl.quantity > 0 THEN sl.quantity * i.average_cost_cents ELSE 0 END),0) as v, '
                .'COALESCE(SUM(CASE WHEN sl.quantity < 0 THEN 1 ELSE 0 END),0) as neg_n, '
                .'COALESCE(SUM(CASE WHEN sl.quantity <= 0 THEN 1 ELSE 0 END),0) as empty_n')->first();

        $foodCost = $this->costReports->foodCostSummary($r['from'], $r['to']);

        return [
            'low' => [
                'count' => $low->count(),
                'items' => $low->take(6)->map(fn ($x) => [
                    'id' => (int) $x->id, 'name' => $x->name, 'unit' => $x->unit,
                    'quantity' => (string) (float) $x->quantity, 'reorder_level' => (string) (float) $x->reorder_level,
                    'is_negative' => (float) $x->quantity < 0,
                ])->all(),
            ],
            'stock_value_cents' => (int) round((float) $value->v),
            'negative_count' => (int) $value->neg_n,
            'empty_count' => (int) $value->empty_n,
            'cogs_cents' => $foodCost['cogs_cents'],
            'waste_cents' => $foodCost['waste_cents'],
            'count_in_progress' => DB::table('stock_counts')->where('status', 'in_progress')->exists(),
        ];
    }

    public function purchasing(): array
    {
        $status = DB::table('purchase_orders')->whereIn('status', ['draft', 'sent', 'partial'])
            ->groupBy('status')->get(['status', DB::raw('COUNT(*) as n'), DB::raw('SUM(total_cents) as cents')])->keyBy('status');

        $today = now()->toDateString();
        $due = DB::table('purchase_orders as po')->join('suppliers as s', 's.id', '=', 'po.supplier_id')
            ->whereIn('po.status', ['sent', 'partial'])->whereNotNull('po.expected_at')
            ->whereDate('po.expected_at', '<=', now()->addDays(7)->toDateString())
            ->orderBy('po.expected_at')->limit(6)
            ->get(['po.id', 'po.po_number', 'po.status', 'po.expected_at', 'po.total_cents', 's.name as supplier'])
            ->map(fn ($x) => [
                'id' => (int) $x->id, 'po_number' => $x->po_number, 'status' => $x->status, 'supplier' => $x->supplier,
                'expected_at' => substr((string) $x->expected_at, 0, 10), 'total_cents' => (int) $x->total_cents,
                'overdue' => substr((string) $x->expected_at, 0, 10) < $today,
            ])->all();

        $n = fn (string $k) => (int) ($status[$k]->n ?? 0);

        return [
            'draft' => $n('draft'), 'sent' => $n('sent'), 'partial' => $n('partial'),
            'open_cents' => (int) (($status['sent']->cents ?? 0) + ($status['partial']->cents ?? 0)),
            'due' => $due,
            'overdue' => count(array_filter($due, fn ($d) => $d['overdue'])),
        ];
    }

    // ------------------------------------------------------------------ kiosk

    /** Phase 7 tables. Until they exist the card shows clearly labelled sample data. */
    public function kiosk(array $r): array
    {
        if (! $this->hasTables('devices', 'kiosk_settings', 'kiosk_sessions')) {
            return $this->sampleKiosk();
        }

        $cutoff = now()->subMinutes(2);
        $devices = DB::table('devices as d')->leftJoin('kiosk_settings as ks', 'ks.device_id', '=', 'd.id')
            ->where('d.type', 'kiosk')->where('d.is_active', true)->orderBy('d.name')
            ->get(['d.id', 'd.name', 'd.last_seen_at', 'd.app_version', 'ks.is_out_of_service'])
            ->map(fn ($x) => [
                'id' => (int) $x->id, 'name' => $x->name, 'app_version' => $x->app_version,
                'last_seen_at' => $x->last_seen_at ? Carbon::parse($x->last_seen_at)->toIso8601String() : null,
                'online' => $x->last_seen_at && Carbon::parse($x->last_seen_at)->greaterThanOrEqualTo($cutoff),
                'out_of_service' => (bool) $x->is_out_of_service,
            ])->all();

        $s = DB::table('kiosk_sessions')->whereBetween('started_at', [$r['from']->copy()->startOfDay(), $r['to']->copy()->endOfDay()])
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),0) as completed, "
                ."COALESCE(SUM(CASE WHEN status IN ('abandoned','timed_out') THEN 1 ELSE 0 END),0) as abandoned")->first();

        return [
            'demo' => false,
            'devices' => $devices,
            'sessions' => [
                'total' => (int) $s->total, 'completed' => (int) $s->completed, 'abandoned' => (int) $s->abandoned,
                'rate' => $s->total > 0 ? (int) round($s->completed / $s->total * 100) : 0,
            ],
        ];
    }

    // ---------------------------------------------------------------- helpers

    private function hasTables(string ...$tables): bool
    {
        foreach ($tables as $t) {
            if (! Schema::hasTable($t)) {
                return false;
            }
        }

        return true;
    }

    /** Placeholder numbers for the kiosk card, shown (and labelled "Sample data") until phase 7 is built. */
    private function sampleKiosk(): array
    {
        return [
            'demo' => true,
            'devices' => [
                ['id' => 1, 'name' => 'Kiosk 1 (sample)', 'app_version' => null, 'last_seen_at' => now()->subSeconds(30)->toIso8601String(), 'online' => true, 'out_of_service' => false],
                ['id' => 2, 'name' => 'Kiosk 2 (sample)', 'app_version' => null, 'last_seen_at' => now()->subMinutes(14)->toIso8601String(), 'online' => false, 'out_of_service' => false],
            ],
            'sessions' => ['total' => 42, 'completed' => 27, 'abandoned' => 15, 'rate' => 64],
        ];
    }

    /**
     * Completed refunds on non-voided orders, keyed by the business date the money went back.
     *
     * @return array<string, int>
     */
    private function refundsByDate(CarbonInterface $from, CarbonInterface $to): array
    {
        return DB::table('refunds')
            ->join('orders', 'orders.id', '=', 'refunds.order_id')
            ->where('refunds.status', 'completed')
            ->where('orders.status', '!=', 'voided')
            ->whereBetween('refunds.business_date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('refunds.business_date')
            ->selectRaw('refunds.business_date as d, COALESCE(SUM(refunds.amount_cents), 0) as cents')
            ->get()
            ->mapWithKeys(fn ($row) => [substr((string) $row->d, 0, 10) => (int) $row->cents])
            ->all();
    }

    private function hourExpr(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%H', $column) AS INTEGER)",
            'pgsql' => "EXTRACT(HOUR FROM $column)::int",
            default => "HOUR($column)",
        };
    }

    private function hourLabel(int $h): string
    {
        return Carbon::createFromTime($h)->format('gA');
    }

    /** @return array<int, array{n:int,cents:int}> filled for 0..23 */
    private function bucketHours($rows): array
    {
        $out = array_fill(0, 24, ['n' => 0, 'cents' => 0]);
        foreach ($rows as $row) {
            $out[(int) $row->h] = ['n' => (int) $row->n, 'cents' => (int) $row->cents];
        }

        return $out;
    }
}
