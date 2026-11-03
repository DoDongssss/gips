<?php

namespace App\Models;

use App\Enums\WasteReason;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['ingredient_id', 'quantity', 'reason', 'notes', 'user_id', 'stock_movement_id'])]
class WasteLog extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'reason' => WasteReason::class];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
