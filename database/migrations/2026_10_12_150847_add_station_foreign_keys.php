<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreign('station_id')->references('id')->on('stations')->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('station_id')->references('id')->on('stations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['station_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['station_id']);
        });
    }
};
