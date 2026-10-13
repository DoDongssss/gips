<?php

namespace App\Models;

use App\Enums\ApprovalAction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** Who approved a sensitive action, and for what. */
class DiscountApproval extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'action' => ApprovalAction::class,
            'approved_at' => 'datetime',
        ];
    }

    public function approvable(): MorphTo
    {
        return $this->morphTo();
    }
}
