<?php

namespace App\Models;

use App\Enums\StockCountStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['status', 'started_by', 'started_at', 'completed_at', 'notes'])]
class StockCount extends Model
{
    protected function casts(): array
    {
        return ['status' => StockCountStatus::class, 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockCountItem::class);
    }
}
