<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

class RoutesAudit extends Command
{
    protected $signature = 'routes:audit {--all : show every route, not only the ones that need attention}';

    protected $description = 'List routes that are neither public on purpose, a kiosk device route, nor protected by a permission';

    public function handle(): int
    {
        $rows = self::audit();
        $bad = array_filter($rows, fn ($r) => $r['verdict'] !== 'ok');

        $this->table(['Method', 'URI', 'Name', 'Verdict', 'Why'], array_map(
            fn ($r) => [$r['method'], $r['uri'], $r['name'], $r['verdict'], $r['why']],
            $this->option('all') ? $rows : $bad,
        ));

        $this->line(count($rows).' routes checked, '.count($bad).' need attention.');

        return $bad === [] ? self::SUCCESS : self::FAILURE;
    }

    /** @return array<int, array{method:string,uri:string,name:string,verdict:string,why:string}> */
    public static function audit(): array
    {
        $public = config('route-audit.public', []);
        $authOnly = config('route-audit.auth_only', []);
        $out = [];

        /** @var LaravelRoute $route */
        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();

            // Framework and package internals
            if (Str::startsWith($uri, ['_', 'livewire', 'telescope', 'horizon']) || $route->getActionName() === 'Closure' && Str::startsWith($uri, '_')) {
                continue;
            }

            $middleware = array_map(fn ($m) => is_string($m) ? $m : 'closure', $route->gatherMiddleware());
            $has = fn (string ...$needles) => collect($middleware)->contains(fn ($m) => Str::startsWith($m, $needles) || Str::contains($m, $needles));

            $signedIn = $has('auth', 'Illuminate\Auth\Middleware\Authenticate');
            $guarded = $has('permission:', 'role:', 'role_or_permission:', 'can:', 'Spatie\Permission\Middleware');
            $device = Str::startsWith((string) $route->getName(), 'kiosk.api.');
            // A device token with a required ability (auth:sanctum + abilities:xxx / ability:xxx).
            $abilityGuarded = $has('abilities:', 'ability:', 'Laravel\\Sanctum\\Http\\Middleware\\CheckAbilities', 'Laravel\\Sanctum\\Http\\Middleware\\CheckForAnyAbility');
            $postOpen = in_array('POST', $route->methods(), true);
            $throttled = $has('throttle');

            [$verdict, $why] = match (true) {
                self::matches($uri, $public) && $postOpen && ! $throttled && ! self::matches($uri, config('route-audit.throttle_exempt', [])) => ['NO THROTTLE', 'public POST without a rate limit'],
                self::matches($uri, $public) => ['ok', 'public on purpose'],
                $signedIn && $abilityGuarded => ['ok', 'device token ability'],
                $device && $has('App\Http\Middleware\EnsureKioskDevice') => ['ok', 'kiosk device route'],
                $device => ['UNGUARDED', 'kiosk route without EnsureKioskDevice'],
                $signedIn && $guarded => ['ok', 'permission'],
                $signedIn && self::matches($uri, $authOnly) => ['ok', 'signed-in only on purpose'],
                $signedIn => ['NO PERMISSION', 'signed in, but any user can open it'],
                default => ['PUBLIC', 'no sign-in required'],
            };

            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                $out[] = ['method' => $method, 'uri' => '/'.ltrim($uri, '/'), 'name' => (string) $route->getName(), 'verdict' => $verdict, 'why' => $why];
            }
        }

        return $out;
    }

    private static function matches(string $uri, array $patterns): bool
    {
        $uri = '/'.ltrim($uri, '/');

        foreach ($patterns as $pattern) {
            if (Str::is('/'.ltrim($pattern, '/'), $uri) || Str::is($pattern, ltrim($uri, '/'))) {
                return true;
            }
        }

        return false;
    }
}
