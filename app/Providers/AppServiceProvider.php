<?php

namespace App\Providers;

use App\Events\OrderPaid;
use App\Listeners\DeductStockWhenOrderPaid;
use App\Listeners\LogAuthEvents;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        Gate::before(fn ($user, $ability) => $user->hasRole('superadmin') ? true : null);

        Event::listen(Login::class, [LogAuthEvents::class, 'onLogin']);
        Event::listen(Logout::class, [LogAuthEvents::class, 'onLogout']);
        Event::listen(Failed::class, [LogAuthEvents::class, 'onFailed']);

        Event::listen(OrderPaid::class, DeductStockWhenOrderPaid::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Model::preventLazyLoading(! app()->isProduction());

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}