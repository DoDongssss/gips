<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderNumberSequence extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['business_date' => 'date:Y-m-d', 'last_number' => 'integer'];
    }
}
