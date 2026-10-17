<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'sort_order'])]
class IngredientCategory extends Model
{
    public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class);
    }
}
