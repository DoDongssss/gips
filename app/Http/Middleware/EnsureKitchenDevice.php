<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Only a paired, active kitchen screen may pass (tied to one station, or with none = all stations). Records when it was last seen.
 *
 * The device is found from its OWN bearer token. Reading $request->user() is not enough: when a staff member is
 * also signed in in the same browser, Sanctum answers with that staff account (their session cookie wins), the
 * check below fails with 403 and the kitchen screen drops back to the pairing page.
 */
class EnsureKitchenDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $device = null;

        if ($request->bearerToken() !== null) {
            $device = PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
        }

        $device ??= $request->user();

        if (! $device instanceof Device || $device->type !== 'kds' || ! $device->is_active) {
            abort(403, 'This screen is not allowed to use the kitchen display.');
        }

        // Controllers read the device with $request->user(): make that the device for this request.
        $request->setUserResolver(fn () => $device);

        if (! $device->last_seen_at || $device->last_seen_at->lt(now()->subSeconds(30))) {
            $device->forceFill(['last_seen_at' => now(), 'ip_address' => $request->ip()])->saveQuietly();
        }

        return $next($request);
    }
}