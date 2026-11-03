<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One recipe per product (variant null) or per product variant. */
#[Fillable(['product_id', 'product_variant_id', 'yield_quantity', 'notes'])]
class Recipe extends Model
{
    protected function casts(): array
    {
        return ['yield_quantity' => 'decimal:2'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }
}
