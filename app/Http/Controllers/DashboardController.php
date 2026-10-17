<?php

namespace App\Http\Controllers;

use App\Services\Dashboard\DashboardService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The dashboard is open to every signed-in user; each section is only built (and sent) when the
 * user holds the permission behind it. Sections are closures, so a partial reload such as
 * router.reload({ only: ['live'] }) runs only that section's queries.
 */
class DashboardController extends Controller
{
    /** @var array<string, mixed> */
    private array $memo = [];

    public function __invoke(Request $request, DashboardService $svc): Response
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

        $live = fn () => $once('live', fn () => $svc->live());
        $shifts = fn () => $once('shifts', fn () => $svc->shifts($user->can('shift.view-all') ? null : $user->id));
        $inventory = fn () => $once('inventory', fn () => $svc->inventory($r));
        $purchasing = fn () => $once('purchasing', function () use ($svc) {
            $p = $svc->purchasing();
            $p['due'] = array_map(fn ($d) => $d + ['href' => route('inventory.purchase-orders.show', $d['id'])], $p['due']);

            return $p;
        });
        $kiosk = fn () => $once('kiosk', fn () => $svc->kiosk($r));

        return Inertia::render('dashboard/index', [
            'range' => [
                'key' => $r['key'], 'label' => $r['label'], 'days' => $r['days'],
                'from' => $r['from']->toDateString(), 'to' => $r['to']->toDateString(),
                'options' => [
                    ['key' => 'today', 'label' => 'Today'], ['key' => 'yesterday', 'label' => 'Yesterday'],
                    ['key' => '7d', 'label' => '7 days'], ['key' => '30d', 'label' => '30 days'], ['key' => 'month', 'label' => 'This month'],
                ],
            ],
            'access' => $access,

            // Live (today). Refreshed on a timer by the page.
            'live' => $access['live'] ? $live : null,
            'shifts' => $access['shifts'] ? $shifts : null,

            // Range based.
            'sales' => $access['sales'] ? fn () => $once('sales', fn () => [
                'summary' => $svc->summary($r['from'], $r['to']),
                'previous' => $svc->summary($r['prev_from'], $r['prev_to']),
                'trend' => $svc->trend($r),
                'hours' => $svc->busyHours($r),
                'payments' => $svc->paymentMethods($r),
                'channels' => $svc->split($r, 'channel'),
                'types' => $svc->split($r, 'type'),
                'products' => $svc->topProducts($r),
                'categories' => $svc->categories($r),
                'staff' => $svc->staff($r),
            ]) : null,

            'inventory' => $access['inventory'] ? $inventory : null,
            'purchasing' => $access['purchasing'] ? $purchasing : null,
            'kiosk' => $access['kiosk'] ? $kiosk : null,

            'alerts' => fn () => $this->alerts($access, $live, $shifts, $inventory, $purchasing, $kiosk),
        ]);
    }

    /** One line per thing that needs a person. Built from the same sections, so it costs no extra queries. */
    private function alerts(array $access, Closure $live, Closure $shifts, Closure $inventory, Closure $purchasing, Closure $kiosk): array
    {
        $out = [];

        if ($access['live'] && ($mins = $live()['kitchen']['oldest_minutes']) !== null && $mins >= 15) {
            $out[] = ['level' => 'danger', 'text' => "The oldest kitchen ticket has waited {$mins} minutes."];
        }

        if ($access['live'] && ($u = $live()['unpaid'])['count'] > 0) {
            $out[] = ['level' => 'info', 'text' => "{$u['count']} order(s) from today are not fully paid."];
        }

        if ($access['shifts']) {
            foreach ($shifts()['open'] as $s) {
                if (\Carbon\Carbon::parse($s["opened_at"])->diffInHours(now()) >= 12) {
                    $out[] = ['level' => 'warning', 'text' => "{$s['cashier']}'s shift has been open for over 12 hours."];
                }
            }
        }

        if ($access['inventory']) {
            $i = $inventory();
            if ($i['negative_count'] > 0) {
                $out[] = ['level' => 'danger', 'text' => "{$i['negative_count']} ingredient(s) have negative stock.", 'href' => route('inventory.ingredients.index', ['filter' => 'negative'])];
            }
            if ($i['low']['count'] > 0) {
                $out[] = ['level' => 'warning', 'text' => "{$i['low']['count']} ingredient(s) are at or under the reorder level.", 'href' => route('inventory.ingredients.index', ['filter' => 'low'])];
            }
        }

        if ($access['purchasing'] && ($n = $purchasing()['overdue']) > 0) {
            $out[] = ['level' => 'warning', 'text' => "{$n} purchase order(s) are past their expected date.", 'href' => route('inventory.purchase-orders.index')];
        }

        if ($access['kiosk'] && ! ($kiosk()['demo'] ?? false)) {
            $offline = count(array_filter($kiosk()['devices'], fn ($d) => ! $d['online'] && ! $d['out_of_service']));
            if ($offline > 0) {
                $out[] = ['level' => 'danger', 'text' => "{$offline} kiosk(s) are offline."];
            }
        }

        return $out;
    }
}
