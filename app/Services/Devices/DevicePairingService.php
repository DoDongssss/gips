<?php

namespace App\Services\Devices;

use App\Models\Device;
use App\Models\KioskSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DevicePairingService
{
    /** Token abilities. A kiosk can read the menu and create orders, nothing else. */
    public const ABILITIES = ['menu:read', 'orders:create'];

    /** No 0/O/1/I/L: the code is typed by hand on a tablet. */
    private const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public function register(string $name, string $type, ?int $stationId, ?User $by): array
    {
        $device = Device::create([
            'name' => $name, 'type' => $type, 'identifier' => (string) Str::uuid(),
            'station_id' => $stationId, 'is_active' => true, 'registered_by' => $by?->id,
        ]);

        if ($type === Device::KIOSK) {
            KioskSetting::create(['device_id' => $device->id]);
        }

        return [$device, $this->issueCode($device)];
    }

    /** A new one-time code. Shown once; only its hash is kept. Older codes stop working. */
    public function issueCode(Device $device): string
    {
        $code = '';
        for ($i = 0; $i < 8; $i++) {
            $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        $device->forceFill([
            'pairing_code_hash' => $this->hash($code),
            'pairing_expires_at' => now()->addHours(config('kiosk.pairing_code_ttl_hours')),
        ])->save();

        return $code;
    }

    /** Exchange a code for a token. The code is single use; pairing again replaces the old token. */
    public function pair(string $code, ?string $ip, ?string $appVersion, ?string $type = null): array
    {
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));

        $device = Device::query()
            ->where('pairing_code_hash', $this->hash($code))
            ->where('pairing_expires_at', '>', now())
            ->where('is_active', true)
            ->when($type !== null, fn ($q) => $q->where('type', $type)) // a kitchen screen only takes a kitchen code
            ->first();

        if (! $device) {
            throw ValidationException::withMessages(['code' => 'That code is not valid or has expired.']);
        }

        $token = DB::transaction(function () use ($device, $ip, $appVersion) {
            $device->tokens()->delete();
            $device->forceFill([
                'pairing_code_hash' => null, 'pairing_expires_at' => null, 'paired_at' => now(),
                'last_seen_at' => now(), 'ip_address' => $ip, 'app_version' => $appVersion,
            ])->save();

            return $device->createToken($device->type, $this->abilitiesFor($device))->plainTextToken;
        });

        return [$device, $token];
    }

    /** What a token may do, by device type. Kitchen screens are limited further by EnsureKitchenDevice. */
    public function abilitiesFor(Device $device): array
    {
        return match ($device->type) {
            Device::KIOSK => self::ABILITIES,
            'kds' => ['kds'],
            default => [], // the register signs in with a staff login
        };
    }

    public function revoke(Device $device): void
    {
        $device->tokens()->delete();
        $device->forceFill(['paired_at' => null, 'pairing_code_hash' => null, 'pairing_expires_at' => null])->save();
    }

    private function hash(string $code): string
    {
        return hash('sha256', $code);
    }
}
