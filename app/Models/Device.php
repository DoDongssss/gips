<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A registered terminal: a kiosk tablet, a register (POS) or a kitchen screen.
 *
 * What each type does:
 *  - kiosk:   authenticates with its own Sanctum token (abilities menu:read, orders:create)
 *  - kitchen: authenticates with its own Sanctum token (abilities kds:read, kds:bump) and shows one station
 *  - pos:     the cashier signs in with a staff login; the device record only marks this tablet as
 *             allowed to use PIN quick-login, so it gets no token abilities
 *
 * A device never uses staff role permissions.
 */
#[Fillable(['name', 'type', 'identifier', 'station_id', 'pairing_code_hash', 'pairing_expires_at', 'paired_at', 'is_active', 'last_seen_at', 'ip_address', 'app_version', 'registered_by'])]
class Device extends Authenticatable
{
    use Audited, HasApiTokens;

    public const KIOSK = 'kiosk';

    public const POS = 'pos';

    public const KITCHEN = 'kitchen';

    /** @var array<int, string> */
    public const TYPES = [self::KIOSK, self::POS, self::KITCHEN];

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

    public function isKiosk(): bool
    {
        return $this->type === self::KIOSK;
    }

    public function isPos(): bool
    {
        return $this->type === self::POS;
    }

    public function isKitchen(): bool
    {
        return $this->type === self::KITCHEN;
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /**
     * What this device's token may do. Used when the pairing code is exchanged for a token.
     *
     * @return array<int, string>
     */
    public function abilities(): array
    {
        return match ($this->type) {
            self::KIOSK => ['menu:read', 'orders:create'],
            self::KITCHEN => ['kds:read', 'kds:bump'],
            default => [], // the register uses staff logins, not a device token
        };
    }

    /** A new token carrying exactly this device's abilities. Returns the plain text token (shown once). */
    public function issueToken(): string
    {
        return $this->createToken('device-'.$this->id, $this->abilities())->plainTextToken;
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