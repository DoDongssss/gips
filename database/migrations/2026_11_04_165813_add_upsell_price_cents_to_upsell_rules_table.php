<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('upsell_rules', function (Blueprint $table) {
            $table->unsignedInteger('upsell_price_cents')->nullable()->after('suggested_product_id');
        });
    }

    public function down(): void
    {
        Schema::table('upsell_rules', function (Blueprint $table) {
            $table->dropColumn('upsell_price_cents');
        });
    }
};
