<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: payments
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods')->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');   // the part applied to the order
            $table->unsignedBigInteger('tendered_cents')->nullable();
            $table->unsignedBigInteger('change_cents')->default(0);
            $table->unsignedBigInteger('tip_cents')->default(0);
            $table->string('status');
            $table->string('reference_no')->nullable();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index(['shift_id', 'status']);
            $table->index(['order_id', 'status'], 'p8_payments_order_status');
            $table->index('paid_at', 'p8_payments_paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
