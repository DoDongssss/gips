<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

class IdempotencyKey extends Model
{
    use MassPrunable;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'response_status' => 'integer',
            'response_body' => 'array',
            'locked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** Pruned by `php artisan model:prune` (schedule it daily). */
    public function prunable(): Builder
    {
        return static::where('expires_at', '<', now());
    }
}
