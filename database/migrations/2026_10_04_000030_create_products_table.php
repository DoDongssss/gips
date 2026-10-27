<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: menu
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('name', 150);
            $table->string('slug')->unique();
            $table->string('sku')->nullable()->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('base_price_cents');
            $table->boolean('is_taxable')->default(true);
            $table->boolean('is_available')->default(true); // false = sold out
            $table->boolean('is_active')->default(true);
            $table->foreignId('station_id')->nullable()->constrained('stations')->nullOnDelete();
            $table->unsignedInteger('prep_time_seconds')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category_id', 'is_active']);
            $table->index(['category_id', 'is_active', 'is_available'], 'p8_products_menu');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
