<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Services\Inventory\CostReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryReportController extends Controller implements HasMiddleware
{
    private const MAX_DAYS = 366;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:report.view', only: ['index']),
            new Middleware('permission:report.export', only: ['export']),
        ];
    }

    /** Cost reports. Summary and each tab load on demand. */
    public function index(Request $request, CostReportService $reports): Response
    {
        [$from, $to] = $this->dates($request);

        return Inertia::render('inventory/reports/index', [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => Inertia::optional(fn () => $reports->foodCostSummary($from, $to)),
            'usage' => Inertia::optional(fn () => $reports->usage($from, $to)),
            'margins' => Inertia::optional(fn () => $reports->productMargins()),
            'stock' => Inertia::optional(fn () => $reports->stockOnHand()),
        ]);
    }

    public function export(Request $request, CostReportService $reports): StreamedResponse
    {
        $data = $request->validate([
            'section' => ['required', 'in:usage,margins,stock'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        [$from, $to] = $this->dates($request);

        $filename = match ($data['section']) {
            'usage' => "inventory-usage-{$from->toDateString()}-to-{$to->toDateString()}.csv",
            'margins' => 'inventory-margins.csv',
            'stock' => 'inventory-stock-on-hand.csv',
        };

        return response()->streamDownload(function () use ($data, $reports, $from, $to) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            if ($data['section'] === 'usage') {
                fputcsv($out, ['Ingredient', 'Unit', 'Bought', 'Returned', 'Used', 'Waste', 'Variance', 'Cost of use', 'Cost of waste', 'Cost of variance']);
                foreach ($reports->usage($from, $to) as $row) {
                    fputcsv($out, [
                        $row['ingredient'], $row['unit'], $row['purchased'], $row['returned'], $row['used'], $row['waste'], $row['variance'],
                        number_format($row['used_cost_cents'] / 100, 2, '.', ''),
                        number_format($row['waste_cost_cents'] / 100, 2, '.', ''),
                        number_format($row['variance_cost_cents'] / 100, 2, '.', ''),
                    ]);
                }
            } elseif ($data['section'] === 'margins') {
                fputcsv($out, ['Product', 'Variant', 'Price', 'Recipe cost', 'Margin', 'Food cost %', 'Needs conversion']);
                foreach ($reports->productMargins() as $row) {
                    fputcsv($out, [
                        $row['product'],
                        $row['variant'] ?? '',
                        number_format($row['price_cents'] / 100, 2, '.', ''),
                        $row['cost_cents'] === null ? '' : number_format($row['cost_cents'] / 100, 2, '.', ''),
                        $row['margin_cents'] === null ? '' : number_format($row['margin_cents'] / 100, 2, '.', ''),
                        $row['food_cost_pct'] ?? '',
                        $row['needs_conversion'] ? 'yes' : 'no',
                    ]);
                }
            } else {
                fputcsv($out, ['Ingredient', 'Unit', 'On hand', 'Reorder at', 'Value', 'Negative', 'Low']);
                foreach ($reports->stockOnHand() as $row) {
                    fputcsv($out, [
                        $row['name'],
                        $row['unit'],
                        $row['quantity'],
                        $row['reorder_level'],
                        number_format($row['value_cents'] / 100, 2, '.', ''),
                        $row['is_negative'] ? 'yes' : 'no',
                        $row['is_low'] ? 'yes' : 'no',
                    ]);
                }
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function dates(Request $request): array
    {
        $to = $request->date('to') ?? now();
        $from = $request->date('from') ?? $to->copy()->subDays(29);
        $to = Carbon::instance($to);
        $from = Carbon::instance($from);

        if ($from->diffInDays($to) > self::MAX_DAYS) {
            $from = $to->copy()->subDays(self::MAX_DAYS);
        }

        return [$from, $to];
    }
}
