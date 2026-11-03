<?php

namespace App\Notifications;

use App\Models\Device;
use Illuminate\Notifications\Notification;

class KioskOfflineNotification extends Notification
{
    public function __construct(public Device $device) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'kiosk_offline',
            'device_id' => $this->device->id,
            'title' => "{$this->device->name} is offline",
            'body' => 'It has not reported in for '.config('kiosk.offline_after_minutes').' minutes. Check its power and Wi-Fi.',
        ];
    }
}
