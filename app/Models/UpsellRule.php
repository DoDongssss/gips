<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['trigger_product_id', 'trigger_category_id', 'suggested_product_id', 'channel', 'message', 'priority', 'is_active'])]
class UpsellRule extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'priority' => 'integer'];
    }

    public function triggerProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'trigger_product_id');
    }

    public function triggerCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'trigger_category_id');
    }

    public function suggestedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'suggested_product_id');
    }
}
