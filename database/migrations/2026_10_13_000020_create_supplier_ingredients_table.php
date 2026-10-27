<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: purchasing
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->string('supplier_sku')->nullable();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->unsignedBigInteger('unit_cost_cents');
            $table->boolean('is_preferred')->default(false);
            $table->timestamps();
            $table->unique(['supplier_id', 'ingredient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_ingredients');
    }
};
