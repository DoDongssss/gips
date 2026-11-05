<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('activitylog:clean')->daily();
Schedule::command('model:prune')->daily();
Schedule::command('inventory:deduct-missing')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('backup:database')->dailyAt('02:30');

Schedule::command('devices:watch')->everyMinute();
Schedule::command('kiosk:maintain')->everyMinute()->withoutOverlapping();
