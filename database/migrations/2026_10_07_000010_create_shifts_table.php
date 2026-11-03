<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: shifts
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
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
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
