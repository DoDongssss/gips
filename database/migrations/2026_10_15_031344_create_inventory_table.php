<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->string('abbreviation', 10)->unique();
            $table->string('type'); // weight, volume, count
            $table->timestamps();
        });

        Schema::create('unit_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignId('to_unit_id')->constrained('units')->restrictOnDelete();
            $table->decimal('factor', 18, 8); // 1 from_unit = factor to_unit
            $table->timestamps();
            $table->unique(['from_unit_id', 'to_unit_id']);
        });

        Schema::create('ingredient_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

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

        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->decimal('yield_quantity', 8, 2)->default(1);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'product_variant_id']);
        });

        Schema::create('recipe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained('recipes')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->timestamps();
        });

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

        Schema::create('stock_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->unique()->constrained('ingredients')->cascadeOnDelete();
            $table->decimal('quantity', 14, 4)->default(0);
            $table->timestamps();
        });

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

        Schema::create('stock_counts', function (Blueprint $table) {
            $table->id();
            $table->string('status'); // draft, in_progress, completed
            $table->foreignId('started_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_count_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_count_id')->constrained('stock_counts')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->decimal('expected_quantity', 14, 4);
            $table->decimal('counted_quantity', 14, 4)->nullable();
            $table->decimal('variance', 14, 4)->nullable();
            $table->timestamps();
            $table->unique(['stock_count_id', 'ingredient_id']);
        });

        Schema::create('waste_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('reason'); // spoilage, spill, expired, mistake, other
            $table->string('notes')->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['waste_logs', 'stock_count_items', 'stock_counts', 'stock_movements', 'stock_levels',
            'modifier_recipe_items', 'recipe_items', 'recipes', 'ingredients', 'ingredient_categories',
            'unit_conversions', 'units'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
