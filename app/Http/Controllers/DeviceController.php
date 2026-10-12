<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeviceRequest;
use App\Models\Device;
use App\Models\Station;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/** Kitchen screens: register one, pair it with a code, switch it off. */
class DeviceController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:setting.view', only: ['index']),
            new Middleware('permission:setting.update', only: ['store', 'update', 'resetPairing']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('devices/index', [
            'devices' => Device::query()->with('station:id,name')->orderBy('name')->get()->map(fn (Device $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'station_id' => $d->station_id,
                'station_name' => $d->station?->name,
                'is_active' => $d->is_active,
                'is_paired' => $d->isPaired(),
                'paired_at' => $d->paired_at?->toIso8601String(),
                'last_seen_at' => $d->last_seen_at?->toIso8601String(),
                'ip_address' => $d->ip_address,
            ]),
            'stations' => Station::active()->ordered()->get(['id', 'name']),
            // Shown once, right after a code is made. The server keeps only a hash.
            'pairing' => session('pairing'),
        ]);
    }

    public function store(DeviceRequest $request): RedirectResponse
    {
        $device = Device::create([
            'name' => $request->validated('name'),
            'type' => 'kds',
            'station_id' => $request->validated('station_id'),
            'is_active' => true,
            'registered_by' => $request->user()->id,
        ]);

        $code = $device->issuePairingCode();
        Audit::record('devices', 'device.registered', "Kitchen screen {$device->name} registered", $device, ['station_id' => $device->station_id]);

        return back()->with('pairing', ['device' => $device->name, 'code' => $code]);
    }

    public function update(DeviceRequest $request, Device $device): RedirectResponse
    {
        $device->fill($request->safe()->only(['name', 'station_id']));

        if ($request->has('is_active')) {
            $device->is_active = $request->boolean('is_active');
        }

        $device->save();

        if (! $device->is_active) {
            $device->tokens()->delete(); // switching a screen off signs it out
        }

        Audit::record('devices', 'device.updated', "Kitchen screen {$device->name} updated", $device, $device->only(['station_id', 'is_active']));

        return back()->with('success', "\"{$device->name}\" saved.");
    }

    /** Signs the screen out and makes a new code, for a replaced or lost tablet. */
    public function resetPairing(Device $device): RedirectResponse
    {
        $code = $device->issuePairingCode();
        Audit::record('devices', 'device.pairing_reset', "Kitchen screen {$device->name} unpaired", $device);

        return back()->with('pairing', ['device' => $device->name, 'code' => $code]);
    }
}
