<?php

namespace App\Models;

use App\Enums\SelectionType;
use App\Observers\MenuCacheObserver;
use Database\Factories\ModifierGroupFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(MenuCacheObserver::class)]
class ModifierGroup extends Model
{
    /** @use HasFactory<ModifierGroupFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'selection_type', 'is_required', 'min_select', 'max_select', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return [
            'selection_type' => SelectionType::class,
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'min_select' => 'integer',
            'max_select' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function modifiers(): HasMany
    {
        return $this->hasMany(Modifier::class)->orderBy('sort_order')->orderBy('id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_modifier_groups')->withPivot('sort_order');
    }
}
