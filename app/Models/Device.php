<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * A registered screen (so far only kitchen screens). It signs in with a Sanctum token
 * it receives once, when someone enters the pairing code shown to the owner.
 * Written only by the controllers, never filled straight from a request.
 */
class Device extends Model
{
    use HasApiTokens;

    /** A pairing code stops working this long after it was made. */
    public const CODE_LIFETIME_HOURS = 24;

    protected $guarded = [];

    protected $hidden = ['pairing_code_hash'];

    protected static function booted(): void
    {
        static::creating(fn (Device $device) => $device->identifier ??= (string) Str::uuid());
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'paired_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function registrar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function isPaired(): bool
    {
        return $this->paired_at !== null;
    }

    /** A fresh 6-digit code, kept only as a hash. The plain code is returned once for display. */
    public function issuePairingCode(): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $this->tokens()->delete();
        $this->forceFill([
            'pairing_code_hash' => Hash::make($code),
            'paired_at' => null,
            'updated_at' => now(),
        ])->save();

        return $code;
    }

    /** The waiting device this code belongs to, if any. */
    public static function findByPairingCode(string $code): ?self
    {
        return static::query()
            ->where('type', 'kds')
            ->where('is_active', true)
            ->whereNull('paired_at')
            ->whereNotNull('pairing_code_hash')
            ->where('updated_at', '>=', now()->subHours(self::CODE_LIFETIME_HOURS))
            ->get()
            ->first(fn (Device $device) => Hash::check($code, $device->pairing_code_hash));
    }
}
