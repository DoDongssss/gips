<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['stock_count_id', 'ingredient_id', 'expected_quantity', 'counted_quantity', 'variance'])]
class StockCountItem extends Model
{
    protected function casts(): array
    {
        return ['expected_quantity' => 'decimal:4', 'counted_quantity' => 'decimal:4', 'variance' => 'decimal:4'];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }
}
