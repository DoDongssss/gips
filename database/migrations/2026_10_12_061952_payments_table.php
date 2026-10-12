<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
            $table->unsignedBigInteger('shift_id')->nullable();  // FK added in Phase 5
            $table->unsignedBigInteger('device_id')->nullable(); // FK added in Phase 7
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index(['shift_id', 'status']);
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('provider');
            $table->string('provider_reference')->nullable();
            $table->string('status');
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->string('error_code')->nullable();
            $table->timestamps();
        });

        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->string('receipt_number')->unique();
            $table->string('type'); // sale | refund | void
            $table->json('content'); // snapshot of what was printed
            $table->unsignedSmallInteger('printed_count')->default(0);
            $table->dateTime('last_printed_at')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payments');
    }
};
