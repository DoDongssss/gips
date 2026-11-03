<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $key
 * @property string|null $value
 * @property string $group
 * @property string $type
 * @property int|null $updated_by
 */
#[Fillable(['key', 'value', 'group', 'type', 'updated_by'])]
class Configuration extends Model
{
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}