<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only a paired, active kitchen screen may pass (tied to one station, or with none = all stations). Records when it was last seen. */
class EnsureKitchenDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $device = $request->user();

        if (! $device instanceof Device || $device->type !== 'kds' || ! $device->is_active) {
            abort(403, 'This screen is not allowed to use the kitchen display.');
        }

        if (! $device->last_seen_at || $device->last_seen_at->lt(now()->subSeconds(30))) {
            $device->forceFill(['last_seen_at' => now(), 'ip_address' => $request->ip()])->saveQuietly();
        }

        return $next($request);
    }
}
