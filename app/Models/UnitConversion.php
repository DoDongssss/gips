<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** 1 from_unit = factor to_unit. */
#[Fillable(['from_unit_id', 'to_unit_id', 'factor'])]
class UnitConversion extends Model
{
    protected function casts(): array
    {
        return ['factor' => 'decimal:8'];
    }

    public function from(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'from_unit_id');
    }

    public function to(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'to_unit_id');
    }
}
