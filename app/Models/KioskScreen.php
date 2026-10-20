<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

#[Fillable(['title', 'type', 'image_path', 'content', 'sort_order', 'starts_at', 'ends_at', 'is_active'])]
class KioskScreen extends Model
{
    protected function casts(): array
    {
        return ['content' => 'array', 'starts_at' => 'datetime', 'ends_at' => 'datetime', 'is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    /** Switched on and inside its start and end dates (either may be empty). */
    public function scopeShowing(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }

    public function imageUrl(): ?string
    {
        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }
}
