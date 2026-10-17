<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

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

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('status'); // draft, sent, partial, received, cancelled
            $table->dateTime('ordered_at')->nullable();
            $table->date('expected_at')->nullable();
            $table->unsignedBigInteger('total_cents')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->decimal('quantity_ordered', 14, 4);
            $table->decimal('quantity_received', 14, 4)->default(0);
            $table->unsignedBigInteger('unit_cost_cents'); // per ordered unit
            $table->timestamps();
        });

        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number')->unique();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->dateTime('received_at');
            $table->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $table->string('invoice_no')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('goods_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')->constrained('goods_receipts')->cascadeOnDelete();
            $table->foreignId('purchase_order_item_id')->nullable()->constrained('purchase_order_items')->nullOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->unsignedBigInteger('unit_cost_cents');
            $table->string('batch_no')->nullable();
            $table->date('expires_on')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['goods_receipt_items', 'goods_receipts', 'purchase_order_items', 'purchase_orders',
            'supplier_ingredients', 'suppliers'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
