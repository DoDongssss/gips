<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kiosk
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->unique()->constrained('devices')->cascadeOnDelete();
            $table->string('language', 8)->default('en');
            $table->string('theme')->nullable();
            $table->string('payment_mode')->default('pay_at_counter'); // pay_at_counter, pay_at_kiosk (later)
            $table->unsignedInteger('idle_timeout_seconds')->default(60);
            $table->boolean('upsell_enabled')->default(true);
            $table->boolean('large_text')->default(false);
            $table->boolean('is_out_of_service')->default(false);
            $table->string('welcome_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_settings');
    }
};
