<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: payments
return new class extends Migration
{
    public function up(): void
    {
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
            $table->index(['payment_id', 'status'], 'p8_refunds_payment_status');
            $table->index('business_date', 'p8_refunds_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
