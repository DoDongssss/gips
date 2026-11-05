<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'loyalty_points_awarded')) {
                $table->boolean('loyalty_points_awarded')->default(false)->after('customer_id');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'customer_id')) {
                $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'customer_id')) {
                $table->dropForeign(['customer_id']);
            }

            if (Schema::hasColumn('orders', 'loyalty_points_awarded')) {
                $table->dropColumn('loyalty_points_awarded');
            }
        });
    }
};
