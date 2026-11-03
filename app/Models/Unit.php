<?php

namespace App\Models;

use App\Enums\UnitType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string $abbreviation
 * @property UnitType $type
 */
#[Fillable(['name', 'abbreviation', 'type'])]
class Unit extends Model
{
    protected function casts(): array
    {
        return ['type' => UnitType::class];
    }
}
