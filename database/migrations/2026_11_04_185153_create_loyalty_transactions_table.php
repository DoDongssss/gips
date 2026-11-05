<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20);
            $table->integer('points');
            $table->unsignedInteger('balance_after');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'created_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'loyalty_points_redeemed')) {
                $table->unsignedInteger('loyalty_points_redeemed')->default(0)->after('loyalty_points_awarded');
            }
            if (! Schema::hasColumn('orders', 'loyalty_redeem_cents')) {
                $table->unsignedInteger('loyalty_redeem_cents')->default(0)->after('loyalty_points_redeemed');
            }
            if (! Schema::hasColumn('orders', 'loyalty_redeemed')) {
                $table->boolean('loyalty_redeemed')->default(false)->after('loyalty_redeem_cents');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'loyalty_redeemed')) {
                $table->dropColumn('loyalty_redeemed');
            }
            if (Schema::hasColumn('orders', 'loyalty_redeem_cents')) {
                $table->dropColumn('loyalty_redeem_cents');
            }
            if (Schema::hasColumn('orders', 'loyalty_points_redeemed')) {
                $table->dropColumn('loyalty_points_redeemed');
            }
        });

        Schema::dropIfExists('loyalty_transactions');
    }
};
