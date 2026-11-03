<?php

namespace App\Support;

/** True once a real broadcast connection (Reverb) is configured. Until then screens poll. */
class Realtime
{
    public static function enabled(): bool
    {
        $default = config('broadcasting.default');

        return $default !== null && ! in_array($default, ['null', 'log'], true);
    }
}
