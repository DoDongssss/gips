<?php

namespace App\Http\Controllers;

use App\Models\ZReport;
use Illuminate\Support\Facades\DB;
use App\Services\Reports\ReportService;
use App\Services\Reports\ZReportService;
use App\Support\BusinessDate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** The end-of-day close. Closing a day needs shift.view-all (manager or owner). */
class ZReportController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:report.view', only: ['index']),
            new Middleware('permission:shift.view-all', only: ['store']),
            new Middleware('permission:report.reopen', only: ['reopen']),
        ];
    }

    public function index(ZReportService $zReports, ReportService $reports): Response
    {
        $current = BusinessDate::current();

        // Any past day (up to today) can be picked, so a day whose Z report was forgotten can still be closed.
        $requested = request()->query('date');
        $today = is_string($requested) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $requested) && $requested <= $current ? $requested : $current;

        // Days in the last 60 that have orders or shifts but no Z report yet.
        $since = now()->parse($current)->subDays(60)->toDateString();
        $active = DB::table('orders')->whereBetween('business_date', [$since, $current])->select('business_date')
            ->union(DB::table('shifts')->whereBetween('business_date', [$since, $current])->select('business_date'))
            ->pluck('business_date')
            ->map(fn ($d) => substr((string) $d, 0, 10))
            ->unique();
        $closed = ZReport::whereBetween('business_date', [$since, $current])->pluck('business_date')->map(fn ($d) => substr((string) $d, 0, 10));
        $pending = $active->diff($closed)->sort()->values();

        return Inertia::render('reports/z-reports', [
            'pending_days' => $pending,
            'current_date' => $current,
            'today' => [
                'business_date' => $today,
                'blockers' => $zReports->blockers($today),
                'preview' => $reports->summary($today, $today),
            ],
            'reports' => ZReport::query()->with('generator:id,name')->latest('business_date')->limit(60)->get()->map(fn (ZReport $z) => [
                'id' => $z->id,
                'report_number' => $z->report_number,
                'business_date' => $z->business_date->toDateString(),
                'generated_by' => $z->generator?->name,
                'generated_at' => $z->generated_at->toIso8601String(),
                'orders_count' => $z->orders_count,
                'gross_sales_cents' => $z->gross_sales_cents,
                'discounts_cents' => $z->discounts_cents,
                'refunds_cents' => $z->refunds_cents,
                'net_sales_cents' => $z->net_sales_cents,
                'tax_cents' => $z->tax_cents,
                'opening_cash_cents' => $z->opening_cash_cents,
                'expected_cash_cents' => $z->expected_cash_cents,
                'counted_cash_cents' => $z->counted_cash_cents,
                'variance_cents' => $z->variance_cents,
                'payments_breakdown' => $z->payments_breakdown,
                'snapshot' => $z->snapshot,
            ])->values(),
        ]);
    }

    public function store(Request $request, ZReportService $zReports): RedirectResponse
    {
        $data = $request->validate(['business_date' => ['required', 'date_format:Y-m-d']]);

        $report = $zReports->generate($data['business_date'], $request->user());

        return back()->with('success', "Z report {$report->report_number} issued. {$report->business_date->toDateString()} is now closed.");
    }

    public function reopen(Request $request, ZReport $zReport, ZReportService $zReports): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        $date = $zReport->business_date->toDateString();
        $zReports->reopen($zReport, $request->user(), $data['reason']);

        return back()->with('success', "{$date} is open again. Fix what you need, then close the day to issue a new Z report.");
    }
}

