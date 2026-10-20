<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Owner and superadmin accounts cannot be used until two-factor authentication is confirmed.
 * They are sent to the setup page; setup, logout and the challenge itself stay reachable.
 * Off until REQUIRE_2FA=true so nobody is locked out before they have set it up.
 */
class RequireTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! config('security.require_2fa') || $user === null || ! $user->hasAnyRole(config('security.require_2fa_roles'))) {
            return $next($request);
        }

        if ($user->two_factor_confirmed_at !== null) {
            return $next($request);
        }

        $setup = trim((string) config('security.two_factor_setup_path'), '/');

        if ($request->is($setup, $setup.'/*', 'user/*', 'logout', 'two-factor-challenge')) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            abort(403, 'Turn on two-factor authentication before continuing.');
        }

        return redirect('/'.$setup)->with('error', 'Set up two-factor authentication to continue.');
    }
}
