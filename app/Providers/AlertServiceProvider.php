<?php

namespace App\Providers;

use App\Events\PosOrdersChanged;
use App\Models\Order;
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

        // Any order created or changed (new kiosk order, paid, status change, void, edit) tells the registers to look again.
        // One push per request however many rows change, sent after the response so it never slows the cashier down.
        Order::saved(fn () => PosOrdersChanged::queue());
    }
}
