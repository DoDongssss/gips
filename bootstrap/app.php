<?php

use App\Http\Middleware\BlockDeviceTokensOutsideKiosk;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireTwoFactor;
use App\Http\Middleware\ThrottleSensitiveRoutes;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['middleware' => ['web', 'auth:sanctum']])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Behind a proxy or load balancer (set TRUSTED_PROXIES=* or a comma-separated list in .env) so HTTPS,
        // the real client IP and rate limits work. Leave it unset when the app is served directly.
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        $middleware->statefulApi();

        // The kiosk tablet authenticates with a Bearer token, not a session, so it has no CSRF token to send.
        $middleware->validateCsrfTokens(except: ['api/v1/kiosk/*']);

        $middleware->api(append: [
            BlockDeviceTokensOutsideKiosk::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            RequireTwoFactor::class,
            ThrottleSensitiveRoutes::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
        //     if (! app()->environment(['local', 'testing'])
        //         && in_array($response->getStatusCode(), [403, 404, 419, 500, 503])) {
        //         return Inertia::render('error', ['status' => $response->getStatusCode()])
        //             ->toResponse($request)
        //             ->setStatusCode($response->getStatusCode());
        //     }

        //     return $response;
        // });
    })->create();