<?php

namespace App\Models;

use App\Enums\StockMovementType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only ledger row. */
#[Fillable(['ingredient_id', 'type', 'quantity_change', 'unit_cost_cents', 'reference_type', 'reference_id', 'user_id', 'notes'])]
class StockMovement extends Model
{
    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity_change' => 'decimal:4',
            'unit_cost_cents' => 'decimal:4',
        ];
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
