<?php

namespace App\Models;

use App\Observers\MenuCacheObserver;
use Database\Factories\ModifierFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(MenuCacheObserver::class)]
class Modifier extends Model
{
    /** @use HasFactory<ModifierFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['modifier_group_id', 'name', 'price_delta_cents', 'is_default', 'is_available', 'sort_order'];

    protected function casts(): array
    {
        return [
            'price_delta_cents' => 'integer',
            'is_default' => 'boolean',
            'is_available' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(ModifierGroup::class, 'modifier_group_id');
    }
}
