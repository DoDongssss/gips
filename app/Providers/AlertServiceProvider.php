<?php

namespace App\Providers;

use App\Models\StockLevel;
use App\Services\Alerts\AlertWatcher;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\ServiceProvider;

class AlertServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Stock changes on every order, so check once after the response (at most every 3 seconds), not on each row.
        // The scheduler (alerts:watch) is the safety net if anything bypasses this.
        StockLevel::saved(function () {
            if (! Cache::add('alerts:stock:debounce', true, 3)) {
                return;
            }

            defer(function () {
                try {
                    app(AlertWatcher::class)->checkStock();
                } catch (\Throwable $e) {
                    report($e);
                }
            });
        });
    }
}
