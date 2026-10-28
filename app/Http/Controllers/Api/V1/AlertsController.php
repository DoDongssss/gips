<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Devices\DeviceAlerts;
use App\Services\Inventory\LowStockReport;
use App\Services\PrinterStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Every alert the header bells and the dashboard show, in one request. Each block is included only if the
 * person may see it: devices and printers need device.manage, stock needs inventory.view.
 * Route: GET api/v1/pos/alerts with ->middleware('permission:device.manage|inventory.view').
 */
class AlertsController extends Controller
{
    public function __invoke(Request $request, DeviceAlerts $devices, PrinterStatusService $printers, LowStockReport $stock): JsonResponse
    {
        $user = $request->user();
        $out = [];

        if ($user->can('device.manage')) {
            $offline = $devices->offline();
            $broken = $printers->problems();

            $out['devices'] = ['count' => $offline->count(), 'items' => $offline];
            $out['printers'] = ['count' => count($broken), 'items' => $broken];
        }

        if ($user->can('inventory.view')) {
            $low = $stock->items();

            $out['stock'] = ['count' => $low->count(), 'items' => $low];
        }

        return response()->json(['data' => $out]);
    }
}
