<?php

namespace App\Models;

use App\Observers\MenuCacheObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[ObservedBy(MenuCacheObserver::class)]
class ProductImage extends Model
{
    protected $fillable = ['product_id', 'path', 'alt', 'is_primary', 'sort_order'];

    protected $appends = ['url'];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected function url(): Attribute
    {
        return Attribute::get(fn () => Storage::disk('public')->url($this->path));
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
