<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Audit
{
    /**
     * Record an audit entry for something a model event cannot express:
     * sign-ins, credential resets, role changes, voids, refunds.
     *
     * The signed-in user is recorded as the causer unless $causer is given.
     * Never put passwords, PINs or generated credentials in $properties.
     *
     * @param  array<string, mixed>  $properties
     */
    public static function record(
        string $log,
        string $event,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        ?Model $causer = null,
    ): void {
        $context = app()->runningInConsole() ? [] : [
            'ip' => request()->ip(),
            'user_agent' => Str::limit((string) request()->userAgent(), 255, ''),
        ];

        $activity = activity($log)->event($event);

        if ($subject !== null) {
            $activity = $activity->performedOn($subject);
        }

        if ($causer !== null) {
            $activity = $activity->causedBy($causer);
        }

        $activity->withProperties($context + $properties)->log($description);
    }
}