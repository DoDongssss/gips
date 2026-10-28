<?php

namespace App\Services\Devices;

use App\Models\Device;
use Illuminate\Support\Collection;

/** Which paired devices (kiosks, kitchen screens) have gone quiet. One rule for the bell, the push and the dashboard. */
class DeviceAlerts
{
    /** @return Collection<int, array{id:int,name:string,type:string,last_seen_at:?string,minutes:int}> */
    public function offline(): Collection
    {
        $cutoff = now()->subMinutes(config('kiosk.offline_after_minutes'));

        return Device::query()
            ->where('is_active', true)
            ->whereNotNull('paired_at')
            ->with('settings')
            ->get()
            // Only kiosks have an "out of service" switch; other device types always count.
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
    }
}
