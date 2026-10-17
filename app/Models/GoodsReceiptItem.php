<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['goods_receipt_id', 'purchase_order_item_id', 'ingredient_id', 'unit_id', 'quantity', 'unit_cost_cents', 'batch_no', 'expires_on'])]
class GoodsReceiptItem extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_cost_cents' => 'integer', 'expires_on' => 'date'];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class)->withTrashed();
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
