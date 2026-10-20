<?php

namespace App\Http\Controllers\Api\V1\Kiosk;

use App\Http\Controllers\Controller;
use App\Models\KioskSession;
use App\Services\Kiosk\KioskOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** One customer's visit at the kiosk, from the first tap to the pickup number (or walking away). */
class KioskSessionController extends Controller
{
    public function start(Request $request, KioskOrderService $orders): JsonResponse
    {
        $data = $request->validate(['language' => ['nullable', 'string', 'max:8']]);
        $device = $request->user();
        $orders->assertInService($device);

        $session = KioskSession::create([
            'uuid' => (string) Str::uuid(), 'device_id' => $device->id, 'status' => KioskSession::ACTIVE,
            'language' => $data['language'] ?? $device->freshSettings()?->language ?? 'en', 'started_at' => now(),
        ]);

        return response()->json(['data' => ['session_uuid' => $session->uuid]], 201);
    }

    /** The customer left or the idle timer fired. Safe to call twice. */
    public function end(Request $request, string $uuid): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['abandoned', 'timed_out'])], 'items_count' => ['nullable', 'integer', 'min:0', 'max:999']]);

        KioskSession::query()->where('device_id', $request->user()->id)->where('uuid', $uuid)->where('status', KioskSession::ACTIVE)
            ->update(['status' => $data['status'], 'items_count' => $data['items_count'] ?? 0, 'ended_at' => now()]);

        return response()->json(['data' => ['ok' => true]]);
    }
}