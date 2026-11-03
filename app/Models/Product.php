<?php

namespace App\Models;

use App\Models\Concerns\GeneratesSlug;
use App\Observers\MenuCacheObserver;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(MenuCacheObserver::class)]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use GeneratesSlug, HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id', 'name', 'slug', 'sku', 'description', 'base_price_cents',
        'is_taxable', 'is_available', 'is_active', 'station_id',
        'prep_time_seconds', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'base_price_cents' => 'integer',
            'is_taxable' => 'boolean',
            'is_available' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'prep_time_seconds' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function modifierGroups(): BelongsToMany
    {
        return $this->belongsToMany(ModifierGroup::class, 'product_modifier_groups')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}
