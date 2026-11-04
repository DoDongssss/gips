<?php

namespace App\Services\Reports;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ShiftStatus;
use App\Models\DocumentSequence;
use App\Models\Order;
use App\Models\Shift;
use App\Models\User;
use App\Models\ZReport;
use App\Services\ConfigurationService;
use App\Support\Audit;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** End-of-day close. A Z report has a sequential number and locks its business date. */
class ZReportService
{
    public function __construct(private ReportService $reports) {}

    /**
     * What stops a day from being closed right now (empty when it can be closed).
     *
     * @return array<int, string>
     */
    public function blockers(string $businessDate): array
    {
        $blockers = [];

        if (ClosedDay::isClosed($businessDate)) {
            $blockers[] = 'This business day is already closed.';
        }
        if ($businessDate > BusinessDate::current()) {
            $blockers[] = 'A day that has not started cannot be closed.';
        }

        $open = $this->openShiftsQuery($businessDate)->get();
        if ($open->isNotEmpty()) {
            $list = $open->map(fn (Shift $s) => "{$s->user->name} ({$s->business_date->toDateString()})")->implode(', ');
            $blockers[] = "Close every shift first. Still open: {$list}.";
        }

        $unpaid = $this->unpaidOrderCount($businessDate);
        if ($unpaid > 0) {
            $blockers[] = "{$unpaid} order(s) still unpaid. Pay or void them before closing the day.";
        }

        return $blockers;
    }

    /**
     * Open shifts that block closing this business date (may include earlier days).
     *
     * @return Collection<int, array{id: int, cashier: string, business_date: string}>
     */
    public function openShifts(string $businessDate): Collection
    {
        return $this->openShiftsQuery($businessDate)
            ->get()
            ->map(fn (Shift $s) => [
                'id' => $s->id,
                'cashier' => $s->user->name,
                'business_date' => $s->business_date->toDateString(),
            ])
            ->values();
    }

    /**
     * Live figures for the close screen before a Z report is issued.
     *
     * @return array{
     *     summary: array<string, mixed>,
     *     cash: array{opening_cents: int, expected_cents: int, counted_cents: int, variance_cents: int},
     *     unpaid_orders: int,
     *     shifts: array<int, array<string, mixed>>
     * }
     */
    public function dayPreview(string $businessDate): array
    {
        $summary = $this->reports->summary($businessDate, $businessDate);
        $shifts = Shift::with('user:id,name')->where('business_date', $businessDate)->orderBy('id')->get();

        return [
            'summary' => $summary,
            'cash' => [
                'opening_cents' => (int) $shifts->sum('opening_cash_cents'),
                'expected_cents' => (int) $shifts->sum('expected_cash_cents'),
                'counted_cents' => (int) $shifts->sum('counted_cash_cents'),
                'variance_cents' => (int) $shifts->sum('variance_cents'),
            ],
            'unpaid_orders' => $this->unpaidOrderCount($businessDate),
            'shifts' => $shifts->map(fn (Shift $s) => [
                'cashier' => $s->user->name,
                'opened_at' => $s->opened_at->toIso8601String(),
                'closed_at' => $s->closed_at?->toIso8601String(),
                'opening_cash_cents' => $s->opening_cash_cents,
                'expected_cash_cents' => $s->expected_cash_cents,
                'counted_cash_cents' => $s->counted_cash_cents,
                'variance_cents' => $s->variance_cents,
            ])->values()->all(),
        ];
    }

    public function generate(string $businessDate, User $user): ZReport
    {
        return DB::transaction(function () use ($businessDate, $user) {
            // The sequence row lock makes two people pressing "close day" take turns.
            $number = DocumentSequence::next('z_report');

            $blockers = $this->blockers($businessDate);
            if ($blockers) {
                throw ValidationException::withMessages(['business_date' => $blockers[0]]);
            }

            $summary = $this->reports->summary($businessDate, $businessDate);

            $shifts = Shift::with('user:id,name')->where('business_date', $businessDate)->orderBy('id')->get();

            $unpaid = $this->unpaidOrderCount($businessDate);

            $report = ZReport::create([
                'report_number' => 'Z-'.str_pad((string) $number, 5, '0', STR_PAD_LEFT),
                'business_date' => $businessDate,
                'generated_by' => $user->id,
                'orders_count' => $summary['orders_count'],
                'gross_sales_cents' => $summary['gross_sales_cents'],
                'discounts_cents' => $summary['discounts_cents'],
                'refunds_cents' => $summary['refunds_cents'],
                'net_sales_cents' => $summary['net_sales_cents'],
                'tax_cents' => $summary['tax_cents'],
                'opening_cash_cents' => (int) $shifts->sum('opening_cash_cents'),
                'expected_cash_cents' => (int) $shifts->sum('expected_cash_cents'),
                'counted_cash_cents' => (int) $shifts->sum('counted_cash_cents'),
                'variance_cents' => (int) $shifts->sum('variance_cents'),
                'payments_breakdown' => $summary['payments'],
                'snapshot' => [
                    'business' => [
                        'name' => app(ConfigurationService::class)->get('business_name'),
                        'address' => app(ConfigurationService::class)->get('business_address'),
                        'tin' => app(ConfigurationService::class)->get('business_tin'),
                    ],
                    'tips_cents' => $summary['tips_cents'],
                    'voids_count' => $summary['voids_count'],
                    'voids_cents' => $summary['voids_cents'],
                    'unpaid_orders' => $unpaid,
                    'shifts' => $shifts->map(fn (Shift $s) => [
                        'cashier' => $s->user->name,
                        'opened_at' => $s->opened_at->toIso8601String(),
                        'closed_at' => $s->closed_at?->toIso8601String(),
                        'opening_cash_cents' => $s->opening_cash_cents,
                        'expected_cash_cents' => $s->expected_cash_cents,
                        'counted_cash_cents' => $s->counted_cash_cents,
                        'variance_cents' => $s->variance_cents,
                    ])->all(),
                ],
                'generated_at' => now(),
            ]);

            // Closing the day again ends the reopened state.
            DB::table('reopened_days')->where('business_date', $businessDate)->delete();

            Audit::record('reports', 'report.z-generated', "Z report {$report->report_number} for {$businessDate}", $report, [
                'net_sales_cents' => $report->net_sales_cents,
                'variance_cents' => $report->variance_cents,
            ]);

            return $report;
        });
    }

    /**
     * Reopen a closed day (the Z report was issued by mistake). The Z report is removed, so the business date
     * accepts orders and shifts again; closing the day later issues a new Z report from the corrected figures.
     * The removed report number is not reused, and the audit log keeps what it said.
     */
    public function reopen(ZReport $report, User $actor, string $reason): void
    {
        DB::transaction(function () use ($report, $actor, $reason) {
            $report = ZReport::query()->lockForUpdate()->findOrFail($report->id);
            $date = $report->business_date->toDateString();

            Audit::record('reports', 'report.z-reopened', "Z report {$report->report_number} for {$date} reopened: {$reason}", $report, [
                'reopened_by' => $actor->id,
                'reason' => $reason,
                'report_number' => $report->report_number,
                'business_date' => $date,
                'generated_by' => $report->generated_by,
                'generated_at' => $report->generated_at?->toIso8601String(),
                'orders_count' => $report->orders_count,
                'gross_sales_cents' => $report->gross_sales_cents,
                'net_sales_cents' => $report->net_sales_cents,
                'variance_cents' => $report->variance_cents,
            ]);

            $report->delete();

            // Remember that this day is reopened: only now may its shifts be reopened.
            DB::table('reopened_days')->updateOrInsert(
                ['business_date' => $date],
                ['reopened_by' => $actor->id, 'reason' => $reason, 'created_at' => now(), 'updated_at' => now()],
            );
        });
    }

    public function unpaidOrderCount(string $businessDate): int
    {
        return Order::query()
            ->where('business_date', $businessDate)
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Voided->value])
            ->where('payment_status', '!=', PaymentStatus::Paid->value)
            ->where('payment_status', '!=', PaymentStatus::Refunded->value)
            ->count();
    }

    /** @return Builder<Shift> */
    private function openShiftsQuery(string $businessDate): Builder
    {
        return Shift::query()
            ->whereDate('business_date', '<=', $businessDate)
            ->where('status', ShiftStatus::Open->value)
            ->with('user:id,name');
    }
}
