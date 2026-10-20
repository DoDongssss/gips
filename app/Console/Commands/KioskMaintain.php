<?php

namespace App\Console\Commands;

use App\Services\Kiosk\KioskMaintenance;
use Illuminate\Console\Command;

class KioskMaintain extends Command
{
    protected $signature = 'kiosk:maintain';

    protected $description = 'Cancel unpaid kiosk orders, close stale sessions and report kiosks that went offline';

    /** Schedule it every minute (routes/console.php): Schedule::command('kiosk:maintain')->everyMinute()->withoutOverlapping(); */
    public function handle(KioskMaintenance $maintenance): int
    {
        $expired = $maintenance->expireUnpaidOrders();
        $closed = $maintenance->closeStaleSessions();
        $offline = $maintenance->reportOfflineKiosks();

        $this->info("Cancelled {$expired} unpaid order(s), closed {$closed} stale session(s), reported ".count($offline).' offline kiosk(s).');

        return self::SUCCESS;
    }
}
