<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: inventory
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_category_id')->nullable()->constrained('ingredient_categories')->nullOnDelete();
            $table->string('name', 150);
            $table->string('sku')->nullable()->unique();
            $table->foreignId('base_unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignId('purchase_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->decimal('average_cost_cents', 14, 4)->default(0); // per base unit
            $table->decimal('reorder_level', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
