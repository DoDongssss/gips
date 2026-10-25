<?php

use App\Broadcasting\ChannelAccess;
use App\Models\Station;
use Illuminate\Support\Facades\Broadcast;

$guards = ['guards' => ['web', 'sanctum']];

Broadcast::channel('kds.station.{station}', fn ($actor, Station $station) => ChannelAccess::station($actor, $station), $guards);
Broadcast::channel('pos.orders', fn ($actor) => ChannelAccess::orders($actor), $guards);