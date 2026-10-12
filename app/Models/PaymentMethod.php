<?php

namespace App\Models;

use App\Enums\PaymentMethodType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'code', 'type', 'requires_reference', 'is_active', 'sort_order'])]
class PaymentMethod extends Model
{
    protected function casts(): array
    {
        return [
            'type' => PaymentMethodType::class,
            'requires_reference' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
