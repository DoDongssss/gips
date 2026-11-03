<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

/** One ping from a kiosk. Pruned after a week by the daily model:prune. */
#[Fillable(['device_id', 'status', 'app_version', 'ip_address'])]
class KioskHeartbeat extends Model
{
    use Prunable;

    public const UPDATED_AT = null;

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(config('kiosk.heartbeat_retention_days')));
    }
}
