<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('device_id')->nullable(); // FK added in Phase 7
            $table->string('status'); // open | closed
            $table->date('business_date');
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->unsignedBigInteger('opening_cash_cents');
            $table->unsignedBigInteger('expected_cash_cents')->nullable();
            $table->unsignedBigInteger('counted_cash_cents')->nullable();
            $table->bigInteger('variance_cents')->nullable(); // signed: counted - expected
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['business_date', 'status']);
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->restrictOnDelete();
            $table->string('type'); // cash_in | cash_out | drop | payout
            $table->unsignedBigInteger('amount_cents');
            $table->string('reason');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index('shift_id');
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('payment_id')->constrained('payments')->restrictOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->date('business_date'); // the day the money went back, not the day of the sale
            $table->unsignedBigInteger('amount_cents');
            $table->string('reason');
            $table->string('status'); // pending | completed
            $table->foreignId('refunded_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('refunded_at')->nullable();
            $table->timestamps();

            $table->index(['business_date', 'status']);
            $table->index('payment_id');
            $table->index('shift_id');
        });

        Schema::create('discount_approvals', function (Blueprint $table) {
            $table->id();
            $table->morphs('approvable');
            $table->string('action'); // discount | void | refund | price_override
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->string('reason')->nullable();
            $table->dateTime('approved_at');
            $table->timestamps();
        });

        Schema::create('x_reports', function (Blueprint $table) {
            $table->id();
            $table->date('business_date');
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->json('snapshot');
            $table->dateTime('generated_at');
            $table->timestamps();

            $table->index('business_date');
        });

        Schema::create('z_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_number')->unique();
            $table->date('business_date')->unique(); // one Z report closes one business day
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('orders_count');
            foreach (['gross_sales', 'discounts', 'refunds', 'net_sales', 'tax', 'opening_cash', 'expected_cash', 'counted_cash'] as $money) {
                $table->bigInteger("{$money}_cents")->default(0);
            }
            $table->bigInteger('variance_cents')->default(0);
            $table->json('payments_breakdown');
            $table->json('snapshot'); // voids, per-shift cash, anything the printout shows
            $table->dateTime('generated_at');
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('shift_id')->references('id')->on('shifts')->nullOnDelete();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreign('shift_id')->references('id')->on('shifts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', fn (Blueprint $table) => $table->dropForeign(['shift_id']));
        Schema::table('orders', fn (Blueprint $table) => $table->dropForeign(['shift_id']));

        Schema::dropIfExists('z_reports');
        Schema::dropIfExists('x_reports');
        Schema::dropIfExists('discount_approvals');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('shifts');
    }
};
