<?php

namespace App\Broadcasting;

use App\Models\Device;
use App\Models\Station;
use App\Models\User;

/**
 * Who may listen on a private channel. Kept apart from routes/channels.php so it can be
 * called and checked directly. A signed-in user needs the permission; a kitchen screen
 * may only listen to its own station.
 */
class ChannelAccess
{
    public static function station(User|Device $actor, Station $station): bool
    {
        if ($actor instanceof Device) {
            return $actor->type === 'kds' && $actor->is_active && $actor->station_id === $station->id;
        }

        return $actor->is_active !== false && $actor->can('kds.view');
    }

    public static function orders(User|Device $actor): bool
    {
        return $actor instanceof User && $actor->is_active !== false && $actor->can('order.view');
    }
}
