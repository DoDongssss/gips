<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/** Rejects create-order and take-payment calls that arrive without an Idempotency-Key header. */
class RequireIdempotencyKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '' || strlen($key) < 8 || strlen($key) > 100) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Send an Idempotency-Key header (8 to 100 characters, for example a UUID).',
            ]);
        }

        $request->attributes->set('idempotency_key', $key);

        return $next($request);
    }
}
