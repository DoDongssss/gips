<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ReportsDomainErrors;
use App\Http\Requests\DeviceRequest;
use App\Models\Device;
use App\Services\Devices\DevicePairingService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** Settings > Devices: every registered terminal (kiosk, register, kitchen screen): add, switch off, pair, unpair, delete. */
class DeviceController extends Controller implements HasMiddleware
{
    use ReportsDomainErrors;

    public static function middleware(): array
    {
        return [new Middleware('permission:device.manage')];
    }

    public function index(): Response
    {
        $devices = Device::query()->with('settings')->withCount(['sessions as sessions_today' => fn ($q) => $q->whereDate('started_at', now()->toDateString())])
            ->orderBy('type')->orderBy('name')->get()
            ->map(fn (Device $d) => [
                'id' => $d->id, 'name' => $d->name, 'type' => $d->type, 'station_id' => $d->station_id,
                'is_active' => $d->is_active, 'paired' => $d->paired_at !== null, 'online' => $d->isOnline(),
                'last_seen_at' => $d->last_seen_at?->toIso8601String(), 'app_version' => $d->app_version, 'ip_address' => $d->ip_address,
                'has_pending_code' => $d->pairing_code_hash !== null && $d->pairing_expires_at?->isFuture(),
                'sessions_today' => $d->sessions_today,
                'settings' => $d->settings?->toKiosk(),
            ]);

        return Inertia::render('devices/index', [
            'devices' => $devices,
            // Flashed by store() and pairingCode(): the only time the plain code is ever visible.
            'pairing' => session('pairing'),
            'stations' => \DB::table('stations')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(DeviceRequest $request, DevicePairingService $pairing): RedirectResponse
    {
        $data = $request->validated();
        [$device, $code] = $pairing->register($data['name'], $data['type'], $data['station_id'] ?? null, $request->user());

        return back()->with('success', "{$device->name} added.")->with('pairing', $this->pairingFlash($device, $code));
    }

    public function update(DeviceRequest $request, Device $device, DevicePairingService $pairing): RedirectResponse
    {
        $data = $request->validated();

        $device->update(['name' => $data['name'], 'station_id' => $data['station_id'] ?? null, 'is_active' => $data['is_active']]);

        if (! $device->is_active) {
            $pairing->revoke($device); // a switched-off tablet stops working at once
        }

        if (isset($data['settings']) && $device->type === Device::KIOSK) {
            $device->settings()->updateOrCreate([], $data['settings']);
        }

        return back()->with('success', 'Device saved.');
    }

    /** A fresh one-time code, for pairing a new tablet or re-pairing a lost one. */
    public function pairingCode(Device $device, DevicePairingService $pairing): RedirectResponse
    {
        if (! $device->is_active) {
            return $this->attempt(fn () => throw new DomainException('Switch the device on before pairing it.'), '');
        }

        return back()->with('pairing', $this->pairingFlash($device, $pairing->issueCode($device)));
    }

    /** Sign the tablet out: its token stops working and it needs a new code. */
    public function unpair(Device $device, DevicePairingService $pairing): RedirectResponse
    {
        $pairing->revoke($device);

        return back()->with('success', "{$device->name} was unpaired.");
    }

    public function destroy(Device $device, DevicePairingService $pairing): RedirectResponse
    {
        return $this->attempt(function () use ($device, $pairing) {
            if (\DB::table('orders')->where('device_id', $device->id)->exists()) {
                throw new DomainException('This device has orders on record. Switch it off instead of deleting it.');
            }

            $pairing->revoke($device);
            $device->delete();
        }, 'Device deleted.');
    }

    /** @return array<string, string> */
    private function pairingFlash(Device $device, string $code): array
    {
        return ['device' => $device->name, 'type' => $device->type, 'code' => $code, 'expires_at' => $device->pairing_expires_at->toIso8601String()];
    }
}
