<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kiosk
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('upsell_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trigger_product_id')->nullable()->constrained('products')->cascadeOnDelete();
            $table->foreignId('trigger_category_id')->nullable()->constrained('categories')->cascadeOnDelete();
            $table->foreignId('suggested_product_id')->constrained('products')->cascadeOnDelete();
            $table->string('channel')->default('all'); // all, pos, kiosk
            $table->string('message')->nullable();
            $table->integer('priority')->default(0); // higher is shown first
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'channel'], 'p8_upsell_active_channel');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upsell_rules');
    }
};
