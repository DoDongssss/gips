<?php

namespace App\Models;

use App\Enums\StationType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Station extends Model
{
    protected $fillable = ['name', 'slug', 'type', 'is_active', 'sort_order'];

    protected static function booted(): void
    {
        static::saving(function (Station $station) {
            if (! $station->slug || $station->isDirty('name') && ! $station->isDirty('slug')) {
                $station->slug = static::uniqueSlug($station->name, $station->id);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'type' => StationType::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public static function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'station';
        $slug = $base;
        $n = 2;

        while (static::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_stations')->withTimestamps();
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(KdsTicket::class);
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
