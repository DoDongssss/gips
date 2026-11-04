<?php

namespace App\Observers;

use App\Services\Menu\MenuCache;

/**
 * Clears the cached menu whenever any menu model changes.
 * Bulk query updates and pivot syncs do not fire model events,
 * so those code paths call MenuCache::flush() explicitly.
 */
class MenuCacheObserver
{
    public function saved($model): void
    {
        app(MenuCache::class)->flush();
    }

    public function deleted($model): void
    {
        app(MenuCache::class)->flush();
    }

    public function restored($model): void
    {
        app(MenuCache::class)->flush();
    }
}
