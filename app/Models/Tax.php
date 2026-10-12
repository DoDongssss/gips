<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'rate', 'is_inclusive', 'is_default', 'is_active'])]
class Tax extends Model
{
    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'is_inclusive' => 'boolean',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /** Rate in basis points: 0.1200 -> 1200. */
    public function rateBasisPoints(): int
    {
        return (int) round(((float) $this->rate) * 10000);
    }
}
