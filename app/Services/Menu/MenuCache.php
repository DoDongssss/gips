<?php

namespace App\Services\Menu;

use Illuminate\Support\Facades\Cache;

/** The cached menu. Kept separate so menu models can clear it without importing MenuService. */
final class MenuCache
{
    public const KEY = 'menu.v2';

    public function flush(): void
    {
        Cache::forget(self::KEY);
    }
}
