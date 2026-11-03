<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * What each register says about its printer. Kept in the cache, not the database: it is live
 * information that is only useful for a few minutes. A register that stops reporting (browser
 * closed, tablet asleep) drops out by itself, so the alert never lingers after closing time.
 */
class PrinterStatusService
{
    private const INDEX = 'printer.status.users';

    /** A register reports every minute; no report for this long means it is closed, not broken. */
    public const FRESH_FOR_SECONDS = 180;

    public function report(User $user, bool $online, ?string $message, ?string $connection): void
    {
        Cache::put($this->key($user->id), [
            'user_id' => $user->id,
            'name' => $user->name,
            'online' => $online,
            'message' => $online ? null : ($message ?: 'The printer is not connected.'),
            'connection' => $connection,
            'at' => now()->getTimestamp(),
        ], now()->addHours(8));

        $ids = Cache::get(self::INDEX, []);
        if (! in_array($user->id, $ids, true)) {
            Cache::put(self::INDEX, [...$ids, $user->id], now()->addHours(8));
        }
    }

    /** Registers that are open right now with a printer that is not working. @return array<int, array<string, mixed>> */
    public function problems(): array
    {
        $now = now()->getTimestamp();

        return collect(Cache::get(self::INDEX, []))
            ->map(fn ($id) => Cache::get($this->key($id)))
            ->filter(fn ($row) => $row && ! $row['online'] && ($now - $row['at']) <= self::FRESH_FOR_SECONDS)
            ->map(fn ($row) => [
                'id' => $row['user_id'],
                'name' => $row['name'],
                'message' => $row['message'],
                'connection' => $row['connection'],
                'minutes' => (int) floor(($now - $row['at']) / 60),
            ])
            ->values()
            ->all();
    }

    private function key(int $userId): string
    {
        return "printer.status.user.{$userId}";
    }
}
