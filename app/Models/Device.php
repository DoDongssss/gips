<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Sanctum\HasApiTokens;

/**
 * A registered terminal: a kiosk tablet, a POS or a kitchen screen. It authenticates with its own Sanctum
 * token (abilities menu:read, orders:create), never with a staff login or role permissions.
 */
#[Fillable(['name', 'type', 'identifier', 'station_id', 'pairing_code_hash', 'pairing_expires_at', 'paired_at', 'is_active', 'last_seen_at', 'ip_address', 'app_version', 'registered_by'])]
class Device extends Authenticatable
{
    use Audited, HasApiTokens;

    public const KIOSK = 'kiosk';

    protected $hidden = ['pairing_code_hash'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'paired_at' => 'datetime',
            'pairing_expires_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    protected function auditAttributes(): array
    {
        return ['name', 'type', 'is_active', 'station_id'];
    }

    public function settings(): HasOne
    {
        return $this->hasOne(KioskSetting::class);
    }

    /** Settings read fresh from the database (never the copy cached on a long-lived model). */
    public function freshSettings(): ?KioskSetting
    {
        return $this->settings()->first();
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(KioskSession::class);
    }

    /** Seen within the offline window. */
    public function isOnline(): bool
    {
        return $this->last_seen_at !== null
            && $this->last_seen_at->greaterThanOrEqualTo(now()->subMinutes(config('kiosk.offline_after_minutes')));
    }
}