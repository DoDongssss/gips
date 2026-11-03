<?php

namespace App\Models;

use App\Enums\ModifierAction;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['modifier_id', 'ingredient_id', 'quantity', 'unit_id', 'action', 'replaces_ingredient_id'])]
class ModifierRecipeItem extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'action' => ModifierAction::class];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function replaces(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'replaces_ingredient_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
