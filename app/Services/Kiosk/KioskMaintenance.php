<?php

namespace App\Services\Kiosk;

use App\Enums\OrderStatus;
use App\Models\Device;
use App\Models\KioskSession;
use App\Models\Order;
use App\Models\User;
use App\Notifications\KioskOfflineNotification;
use App\Services\Orders\OrderStatusService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Notification;

/** The once-a-minute housekeeping behind `kiosk:maintain`. */
class KioskMaintenance
{
    public function __construct(private OrderStatusService $statuses, private KioskActor $actor) {}

    /** Cancel kiosk orders nobody paid for. Returns how many. */
    public function expireUnpaidOrders(): int
    {
        $cutoff = now()->subMinutes(config('kiosk.unpaid_expiry_minutes'));
        $actor = null;
        $done = 0;

        Order::query()
            ->where('channel', 'kiosk')->where('status', OrderStatus::Open->value)->where('payment_status', 'unpaid')
            ->where('created_at', '<', $cutoff)->orderBy('id')
            ->each(function (Order $order) use (&$actor, &$done) {
                $actor ??= $this->actor->user();

                try {
                    DB::table('orders')->where('id', $order->id)->update(['cancel_reason' => 'Not paid at the counter in time']);
                    $this->statuses->transition($order, OrderStatus::Cancelled, $actor, deviceId: $order->device_id);
                    $done++;
                } catch (\Throwable $e) {
                    report($e);
                }
            });

        return $done;
    }

    /** Customer sessions left "active" for too long become timed out. */
    public function closeStaleSessions(): int
    {
        return KioskSession::query()->where('status', KioskSession::ACTIVE)
            ->where('started_at', '<', now()->subMinutes(config('kiosk.stale_session_minutes')))
            ->update(['status' => 'timed_out', 'ended_at' => now()]);
    }

    /**
     * Tell the managers once when a kiosk goes quiet, and again only after it has come back and gone quiet again.
     * Returns the names of kiosks newly reported offline.
     *
     * @return array<int, string>
     */
    public function reportOfflineKiosks(): array
    {
        $cutoff = now()->subMinutes(config('kiosk.offline_after_minutes'));
        $reported = [];

        $kiosks = Device::query()->where('type', Device::KIOSK)->where('is_active', true)->whereNotNull('paired_at')->with('settings')->get();

        foreach ($kiosks as $device) {
            $key = "kiosk:offline-notified:{$device->id}";
            $quiet = ($device->last_seen_at ?? $device->paired_at)->lessThan($cutoff);

            if (! $quiet || $device->settings?->is_out_of_service) {
                Cache::forget($key);

                continue;
            }

            // No notifications table yet (php artisan make:notifications-table): skip quietly instead of failing every minute.
            if (! Schema::hasTable('notifications')) {
                continue;
            }

            if (Cache::add($key, true, now()->addDay())) {
                Notification::send(User::permission('device.manage')->get(), new KioskOfflineNotification($device));
                $reported[] = $device->name;
            }
        }

        return $reported;
    }
}