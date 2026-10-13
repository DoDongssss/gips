<?php

namespace App\Http\Controllers;

use App\Services\Reports\ReportService;
use App\Support\BusinessDate;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Sales reports for a date range, on screen and as CSV. */
class ReportController extends Controller implements HasMiddleware
{
    /** Longest range a report may cover, so a page never loads a year of orders by accident. */
    private const MAX_DAYS = 366;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:report.view', only: ['index']),
            new Middleware('permission:report.export', only: ['export']),
        ];
    }

    public function index(Request $request, ReportService $reports): Response
    {
        [$type, $from, $to] = $this->filters($request);

        return Inertia::render('reports/index', [
            'filters' => ['type' => $type, 'from' => $from, 'to' => $to],
            'types' => collect(ReportService::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'report' => $reports->table($type, $from, $to),
        ]);
    }

    public function export(Request $request, ReportService $reports): StreamedResponse
    {
        [$type, $from, $to] = $this->filters($request);
        $report = $reports->table($type, $from, $to);
        $columns = $report['columns'];

        $money = fn (array $column, mixed $value) => $column['type'] === 'money' ? number_format($value / 100, 2, '.', '') : $value;
        // A cell that starts with = + - @ would run as a formula in a spreadsheet.
        $safe = fn (mixed $value) => is_string($value) && preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;

        return response()->streamDownload(function () use ($report, $columns, $money, $safe) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // so Excel reads the peso text as UTF-8
            fputcsv($out, array_column($columns, 'label'));

            foreach ($report['rows'] as $row) {
                fputcsv($out, array_map(fn (array $c) => $safe($money($c, $row[$c['key']] ?? '')), $columns));
            }

            if ($report['totals']) {
                fputcsv($out, array_map(fn (array $c) => isset($report['totals'][$c['key']]) ? $money($c, $report['totals'][$c['key']]) : '', $columns));
            }

            fclose($out);
        }, "{$type}-{$from}-to-{$to}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{0: string, 1: string, 2: string} */
    private function filters(Request $request): array
    {
        $data = $request->validate([
            'type' => ['nullable', Rule::in(array_keys(ReportService::TYPES))],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $today = BusinessDate::current();
        $from = $data['from'] ?? $today;
        $to = $data['to'] ?? $from;

        if (strtotime($to) - strtotime($from) > self::MAX_DAYS * 86400) {
            $from = date('Y-m-d', strtotime($to) - self::MAX_DAYS * 86400);
        }

        return [$data['type'] ?? 'daily', $from, $to];
    }
}
