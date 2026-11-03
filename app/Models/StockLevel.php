<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Cached sum of stock_movements. Never edit directly; rebuild with inventory:rebuild-stock. */
#[Fillable(['ingredient_id', 'quantity'])]
class StockLevel extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:4'];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }
}
