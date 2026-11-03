<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rate limits for public routes that Fortify defines and we cannot edit (password reset mails and resets).
 * Per IP address and path, so one visitor cannot flood the mail server or guess reset tokens.
 * Register on the web group (see APPLY-throttle.md). Limits are in config/security.php.
 */
class ThrottleSensitiveRoutes
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('POST')) {
            return $next($request);
        }

        foreach (config('security.throttled_posts', []) as $path => [$max, $seconds]) {
            if (! $request->is($path)) {
                continue;
            }

            $key = 'sensitive:'.$path.'|'.$request->ip();

            if (RateLimiter::tooManyAttempts($key, $max)) {
                return response()->json(['message' => 'Too many attempts. Try again in '.RateLimiter::availableIn($key).' seconds.'], 429)
                    ->withHeaders(['Retry-After' => RateLimiter::availableIn($key)]);
            }

            RateLimiter::hit($key, $seconds);
        }

        return $next($request);
    }
}
