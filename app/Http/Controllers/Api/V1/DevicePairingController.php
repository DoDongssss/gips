<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** A kitchen screen trades its pairing code for a token. Public, but rate limited. */
class DevicePairingController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'digits:6'],
            'app_version' => ['nullable', 'string', 'max:50'],
        ]);

        $device = Device::findByPairingCode($data['code']);

        if (! $device) {
            throw ValidationException::withMessages(['code' => 'That code is not valid or has expired. Ask the owner for a new one.']);
        }

        $device->forceFill([
            'pairing_code_hash' => null,
            'paired_at' => now(),
            'last_seen_at' => now(),
            'ip_address' => $request->ip(),
            'app_version' => $data['app_version'] ?? null,
        ])->save();

        $device->tokens()->delete();

        return response()->json(['data' => [
            'token' => $device->createToken('kds', ['kds'])->plainTextToken,
            'device' => ['id' => $device->id, 'name' => $device->name],
            'station' => ['id' => $device->station->id, 'name' => $device->station->name],
        ]]);
    }
}
