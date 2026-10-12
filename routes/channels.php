<?php

use App\Broadcasting\ChannelAccess;
use App\Models\Station;
use Illuminate\Support\Facades\Broadcast;

$guards = ['guards' => ['web', 'sanctum']];

// A kitchen screen listens to one station: staff need kds.view, a paired screen only its own station.
Broadcast::channel('kds.station.{station}', fn ($actor, Station $station) => ChannelAccess::station($actor, $station), $guards);

// Order status changes for the cashier's ready board.
Broadcast::channel('pos.orders', fn ($actor) => ChannelAccess::orders($actor), $guards);
