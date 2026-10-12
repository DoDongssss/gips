<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DocumentSequence extends Model
{
    protected $guarded = [];

    /** Next number for a named counter. Call inside a transaction so the row lock holds. */
    public static function next(string $key): int
    {
        DB::table('document_sequences')->insertOrIgnore([
            'key' => $key, 'last_number' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $row = static::where('key', $key)->lockForUpdate()->firstOrFail();
        $row->increment('last_number');

        return (int) $row->last_number;
    }
}
