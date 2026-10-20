<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Kiosk routes only: the caller must be an active kiosk device whose token carries the ability.
 * Use as: EnsureKioskDevice::class.':menu:read' after auth:sanctum.
 */
class EnsureKioskDevice
{
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $device = $request->user();

        if (! $device instanceof Device || $device->type !== Device::KIOSK || ! $device->is_active || ! $device->tokenCan($ability)) {
            return response()->json(['message' => 'This device is not allowed to do that.'], 403);
        }

        return $next($request);
    }
}
