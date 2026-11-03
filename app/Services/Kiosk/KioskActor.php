<?php

namespace App\Services\Kiosk;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Orders must be recorded under a User (OrderService needs one). The kiosk uses one locked system user:
 * inactive, random password, no roles, so nobody can sign in as it. The real source of the order is
 * orders.device_id and orders.channel = kiosk.
 */
class KioskActor
{
    public function user(): User
    {
        return User::query()->firstOrCreate(
            ['email' => config('kiosk.actor_email')],
            ['name' => 'Kiosk', 'password' => Hash::make(Str::random(48)), 'is_active' => false],
        );
    }
}
