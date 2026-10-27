<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kiosk
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_screens', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type')->default('promo'); // welcome, promo, banner
            $table->string('image_path')->nullable();
            $table->json('content')->nullable(); // { "headline": "...", "subtext": "..." }
            $table->integer('sort_order')->default(0);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_screens');
    }
};
