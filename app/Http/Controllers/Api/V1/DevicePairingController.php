<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Devices\DevicePairingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * A kitchen screen trades its pairing code (made in Settings > Devices) for a token.
 * Public on purpose and rate limited: give the route ->middleware('throttle:10,1').
 */
class DevicePairingController extends Controller
{
    public function __invoke(Request $request, DevicePairingService $pairing): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:20'],
            'app_version' => ['nullable', 'string', 'max:50'],
        ]);

        [$device, $token] = $pairing->pair($data['code'], $request->ip(), $data['app_version'] ?? null, 'kds');

        $station = DB::table('stations')->where('id', $device->station_id)->first(['id', 'name', 'type']);

        return response()->json(['data' => [
            'token' => $token,
            'device' => ['id' => $device->id, 'name' => $device->name],
            // No station on the device = an all-stations screen (id 0).
            'station' => $station ? ['id' => $station->id, 'name' => $station->name, 'type' => $station->type] : ['id' => 0, 'name' => 'All stations', 'type' => 'all'],
        ]]);
    }
}
