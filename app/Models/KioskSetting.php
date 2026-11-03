<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['device_id', 'language', 'theme', 'payment_mode', 'idle_timeout_seconds', 'upsell_enabled', 'large_text', 'is_out_of_service', 'welcome_message'])]
class KioskSetting extends Model
{
    protected function casts(): array
    {
        return ['upsell_enabled' => 'boolean', 'large_text' => 'boolean', 'is_out_of_service' => 'boolean', 'idle_timeout_seconds' => 'integer'];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    /** What the tablet needs to know, in one shape. */
    public function toKiosk(): array
    {
        return [
            'language' => $this->language,
            'theme' => $this->theme,
            'payment_mode' => $this->payment_mode,
            'idle_timeout_seconds' => $this->idle_timeout_seconds,
            'upsell_enabled' => $this->upsell_enabled,
            'large_text' => $this->large_text,
            'is_out_of_service' => $this->is_out_of_service,
            'welcome_message' => $this->welcome_message,
        ];
    }
}
