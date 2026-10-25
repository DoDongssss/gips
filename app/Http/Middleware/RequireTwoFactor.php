<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Owner and super-admin accounts cannot be used until two-factor authentication is confirmed.
 * They are sent to the setup page; everything the setup itself needs stays reachable.
 * Off until REQUIRE_2FA=true so nobody is locked out before they have set it up.
 */
class RequireTwoFactor
{
    /** Paths that must work while 2FA is not set up yet, or setup could never finish (that is the loop). */
    private const ALWAYS_OPEN = [
        'user/*',              // Fortify: enable/confirm 2FA, QR code, secret key, recovery codes, password confirmation
        // 'confirm-password',
        // 'confirmed-password-status',
        'two-factor-challenge',
        'logout',
        'up',
        'broadcasting/auth',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! config('security.require_2fa') || $user === null || ! $user->hasAnyRole(config('security.require_2fa_roles'))) {
            return $next($request);
        }

        // The 2FA columns are not in the users table yet (migration not run): do not lock anyone out.
        if (! array_key_exists('two_factor_confirmed_at', $user->getAttributes())) {
            return $next($request);
        }

        if ($user->two_factor_confirmed_at !== null) {
            return $next($request);
        }

        $setup = trim((string) config('security.two_factor_setup_path'), '/');

        if ($request->is($setup, $setup.'/*', ...self::ALWAYS_OPEN)) {
            return $next($request);
        }

        // Page visits (including Inertia navigation, which is AJAX) are sent to the setup page.
        // Only true background calls (JSON, API, prefetch) get a plain 403.
        $isPage = $request->header('X-Inertia') !== null || ! $request->expectsJson();

        if (! $isPage || $request->is('api/*') || $request->header('Purpose') === 'prefetch') {
            abort(403, 'Turn on two-factor authentication before continuing.');
        }

        return redirect('/'.$setup)->with('error', 'Set up two-factor authentication to continue.');
    }
}