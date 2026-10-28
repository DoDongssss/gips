<?php

namespace App\Console\Commands;

use App\Services\Alerts\AlertWatcher;
use Illuminate\Console\Command;

class AlertsWatch extends Command
{
    protected $signature = 'alerts:watch';

    /** The old name keeps working, so an existing schedule line does not need changing. */
    protected $aliases = ['devices:watch'];

    protected $description = 'Push a Pusher update when offline devices, printer problems or low stock changed';

    public function handle(AlertWatcher $watcher): int
    {
        foreach ($watcher->checkAll() as $kind => $pushed) {
            $this->line(sprintf('%-8s %s', $kind, $pushed ? 'changed, pushed' : 'no change'));
        }

        return self::SUCCESS;
    }
}
