<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: inventory
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->string('type'); // purchase, sale, adjustment, waste, count, return
            $table->decimal('quantity_change', 14, 4); // signed, base unit
            $table->decimal('unit_cost_cents', 14, 4)->nullable();
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamp('created_at')->nullable();

            // One order deducts each ingredient once.
            $table->unique(['type', 'reference_type', 'reference_id', 'ingredient_id'], 'stock_movements_reference_unique');
            $table->index(['ingredient_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
