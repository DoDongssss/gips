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

class InventoryReportController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:report.view')];
    }

    /** Cost reports. Each section loads on its own so the page opens fast. */
    public function index(Request $request, CostReportService $reports): Response
    {
        $to = $request->date('to') ?? now();
        $from = $request->date('from') ?? $to->copy()->subDays(29);
        $to = Carbon::instance($to);
        $from = Carbon::instance($from);

        return Inertia::render('inventory/reports/index', [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => $reports->foodCostSummary($from, $to),
            'usage' => Inertia::optional(fn () => $reports->usage($from, $to)),
            'margins' => Inertia::optional(fn () => $reports->productMargins()),
            'stock' => Inertia::optional(fn () => $reports->stockOnHand()),
        ]);
    }
}
