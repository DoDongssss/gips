<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('activitylog:clean')->daily();
Schedule::command('model:prune')->daily();
Schedule::command('inventory:deduct-missing')->everyFiveMinutes()->withoutOverlapping();