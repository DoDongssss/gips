<?php

namespace App\Listeners;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Records sign-ins, sign-outs and failed sign-ins in the audit log.
 *
 * Registered in AppServiceProvider. The method names deliberately do not start with
 * "handle", so Laravel's automatic event discovery does not register them a second time.
 */
class LogAuthEvents
{
    public function onLogin(Login $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        Audit::record('auth', 'login', "{$event->user->name} signed in", $event->user, causer: $event->user);
    }

    public function onLogout(Logout $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        Audit::record('auth', 'logout', "{$event->user->name} signed out", $event->user, causer: $event->user);
    }

    public function onFailed(Failed $event): void
    {
        $email = (string) ($event->credentials['email'] ?? '');

        // Only the email is recorded. The password that was typed is never stored.
        Audit::record(
            'auth',
            'login_failed',
            $email !== '' ? "Failed sign-in attempt for {$email}" : 'Failed sign-in attempt',
            $event->user instanceof User ? $event->user : null,
            ['email' => $email !== '' ? $email : null],
        );
    }
}