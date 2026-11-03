<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Generates a unique slug from `name` on create. Soft-deleted rows are
 * included in the check because the unique index still covers them.
 */
trait GeneratesSlug
{
    protected static function bootGeneratesSlug(): void
    {
        static::creating(function ($model) {
            if (filled($model->slug)) {
                return;
            }

            $base = Str::slug($model->name) ?: 'item';
            $slug = $base;
            $i = 2;

            while (static::withTrashed()->where('slug', $slug)->exists()) {
                $slug = $base.'-'.$i++;
            }

            $model->slug = $slug;
        });
    }
}
