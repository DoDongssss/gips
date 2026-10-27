<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;

/** Paired devices (kiosks, kitchen screens) that have gone quiet right now. Powers the bell in the header. */
class DeviceAlertController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $cutoff = now()->subMinutes(config('kiosk.offline_after_minutes'));

        $offline = Device::query()
            ->where('is_active', true)
            ->whereNotNull('paired_at')
            ->with('settings')
            ->get()
            ->filter(fn (Device $d) => ! ($d->type === Device::KIOSK && $d->settings?->is_out_of_service)
                && ($d->last_seen_at ?? $d->paired_at)->lessThan($cutoff))
            ->map(fn (Device $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'type' => $d->type,
                'last_seen_at' => $d->last_seen_at?->toIso8601String(),
                'minutes' => (int) ($d->last_seen_at ?? $d->paired_at)->diffInMinutes(now()),
            ])
            ->values();

        return response()->json(['data' => ['count' => $offline->count(), 'items' => $offline]]);
    }
}
