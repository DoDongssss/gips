<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: inventory
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modifier_recipe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modifier_id')->constrained('modifiers')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->string('action'); // add, remove, replace
            $table->foreignId('replaces_ingredient_id')->nullable()->constrained('ingredients')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modifier_recipe_items');
    }
};
