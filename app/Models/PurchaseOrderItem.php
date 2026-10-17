<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['purchase_order_id', 'ingredient_id', 'unit_id', 'quantity_ordered', 'quantity_received', 'unit_cost_cents'])]
class PurchaseOrderItem extends Model
{
    protected function casts(): array
    {
        return ['quantity_ordered' => 'decimal:4', 'quantity_received' => 'decimal:4', 'unit_cost_cents' => 'integer'];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
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
