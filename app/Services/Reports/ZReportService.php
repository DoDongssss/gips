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
use App\Support\Audit;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use App\Support\PosSettings;
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

        $open = Shift::whereDate('business_date', '<=', $businessDate)->where('status', ShiftStatus::Open->value)->with('user:id,name')->lockForUpdate()->get();
        if ($open->isNotEmpty()) {
            $names = $open->pluck('user.name')->implode(', ');
            $blockers[] = "Close every shift first. Still open: {$names}.";
        }

        return $blockers;
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

            $unpaid = Order::where('business_date', $businessDate)
                ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Voided->value])
                ->where('payment_status', '!=', PaymentStatus::Paid->value)
                ->where('payment_status', '!=', PaymentStatus::Refunded->value)
                ->count();

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
                        'name' => PosSettings::get('business', 'name', config('app.name')),
                        'address' => PosSettings::get('business', 'address'),
                        'tin' => PosSettings::get('business', 'tin'),
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
}