<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: orders
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('order_number', 16);
            $table->date('business_date');
            $table->string('channel');
            $table->string('type');
            $table->string('status');
            $table->string('payment_status');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable(); // post-MVP
            $table->string('customer_name')->nullable();
            foreach (['subtotal', 'discount', 'tax', 'tip', 'total', 'paid'] as $money) {
                $table->unsignedBigInteger("{$money}_cents")->default(0);
            }
            $table->boolean('requires_verification')->default(false);
            $table->text('notes')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();

            $table->unique(['business_date', 'order_number']);
            $table->index(['business_date', 'status']);
            $table->index('channel');
            $table->index(['business_date', 'payment_status'], 'p8_orders_day_pay');
            $table->index(['channel', 'status', 'payment_status', 'created_at'], 'p8_orders_channel_flow');
            $table->index('created_at', 'p8_orders_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
