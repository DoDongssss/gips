<?php

namespace App\Http\Controllers;

use App\Services\Dashboard\DashboardAttentionBuilder;
use App\Services\Dashboard\DashboardService;
use App\Support\BusinessDate;
use App\Support\ClosedDay;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The dashboard is open to every signed-in user; each section is built only when the user
 * holds the permission behind it.
 */
class DashboardController extends Controller
{
    /** @var array<string, mixed> */
    private array $memo = [];

    public function __invoke(Request $request, DashboardService $svc, DashboardAttentionBuilder $attention): Response
    {
        $user = $request->user();
        $r = $svc->range($request->query('range'));

        $access = [
            'sales' => $user->can('report.view'),
            'live' => $user->can('order.view') || $user->can('kds.view'),
            'shifts' => $user->can('shift.view-all') || $user->can('shift.open'),
            'inventory' => $user->can('inventory.view'),
            'purchasing' => $user->can('purchase.manage'),
            'kiosk' => $user->can('device.manage'),
        ];

        $once = function (string $key, Closure $build) {
            return $this->memo[$key] ??= $build();
        };

        $liveData = $access['live'] ? $once('live', fn () => $svc->live()) : null;
        $shiftsData = $access['shifts'] ? $once('shifts', fn () => $svc->shifts($user->can('shift.view-all') ? null : $user->id)) : null;
        $inventoryData = $access['inventory'] ? $once('inventory', fn () => $svc->inventory($r)) : null;
        $purchasingData = $access['purchasing'] ? $once('purchasing', function () use ($svc) {
            $p = $svc->purchasing();
            $p['due'] = array_map(fn ($d) => $d + ['href' => route('inventory.purchase-orders.show', $d['id'])], $p['due']);

            return $p;
        }) : null;
        $kioskData = $access['kiosk'] ? $once('kiosk', fn () => $svc->kiosk($r)) : null;
        $salesData = $access['sales'] ? $once('sales', fn () => [
            'summary' => $svc->summary($r['from'], $r['to']),
            'previous' => $svc->summary($r['prev_from'], $r['prev_to']),
            'as_of' => now()->toIso8601String(),
            'trend' => $svc->trend($r),
            'hours' => $svc->busyHours($r),
            'payments' => $svc->paymentMethods($r),
            'channels' => $svc->split($r, 'channel'),
            'types' => $svc->split($r, 'type'),
            'products' => $svc->topProducts($r),
            'categories' => $svc->categories($r),
            'staff' => $svc->staff($r),
        ]) : null;

        $hasData = $access['live'] || $access['sales'] || $access['shifts'] || $access['inventory'] || $access['purchasing'] || $access['kiosk'];

        return Inertia::render('dashboard/index', [
            'meta' => [
                'business_date' => BusinessDate::current(),
                'layout' => $this->layoutPreset($access),
                'day_closed' => ClosedDay::isClosed(BusinessDate::current()),
            ],
            'range' => [
                'key' => $r['key'], 'label' => $r['label'], 'days' => $r['days'],
                'from' => $r['from']->toDateString(), 'to' => $r['to']->toDateString(),
                'options' => [
                    ['key' => 'today', 'label' => 'Today'], ['key' => 'yesterday', 'label' => 'Yesterday'],
                    ['key' => '7d', 'label' => '7 days'], ['key' => '30d', 'label' => '30 days'], ['key' => 'month', 'label' => 'This month'],
                ],
            ],
            'access' => $access,
            'can_load' => $hasData,

            'live' => $liveData,
            'shifts' => $shiftsData,
            'sales' => $salesData,
            'inventory' => $inventoryData,
            'purchasing' => $purchasingData,
            'kiosk' => $kioskData,

            'attention' => $hasData
                ? $attention->build($access, $liveData, $shiftsData, $inventoryData, $purchasingData, $kioskData)
                : [],
        ]);
    }

    /** @param  array<string, bool>  $access */
    private function layoutPreset(array $access): string
    {
        if ($access['sales']) {
            return 'owner';
        }

        if ($access['live'] && $access['shifts']) {
            return 'operations';
        }

        if ($access['shifts']) {
            return 'cashier';
        }

        if ($access['live']) {
            return 'kitchen';
        }

        return 'default';
    }
}
