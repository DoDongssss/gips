<?php

namespace App\Models;

use App\Enums\KdsTicketStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Written only by KdsService, never filled from a request. */
class KdsTicket extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => KdsTicketStatus::class,
            'fired_at' => 'datetime',
            'started_at' => 'datetime',
            'ready_at' => 'datetime',
            'bumped_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(KdsTicketItem::class)->orderBy('id');
    }

    public function bumper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'bumped_by');
    }
}
