<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kiosk
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique(); // the kiosk sends it back when it places the order: one session, one order
            $table->foreignId('device_id')->constrained('devices')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('status')->default('active'); // active, completed, abandoned, timed_out
            $table->string('language', 8)->default('en');
            $table->unsignedInteger('items_count')->default(0);
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_sessions');
    }
};
