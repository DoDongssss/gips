<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->string('product_name');             // snapshot
            $table->string('variant_name')->nullable(); // snapshot
            $table->unsignedBigInteger('unit_price_cents'); // snapshot: variant or base price
            $table->unsignedSmallInteger('quantity');
            // Per UNIT: sum of modifier price changes. Unit total = unit_price + modifiers_total.
            $table->bigInteger('modifiers_total_cents')->default(0);
            $table->unsignedBigInteger('discount_cents')->default(0); // this line's share of all discounts
            $table->unsignedBigInteger('tax_cents')->default(0);      // this line's share of tax
            $table->unsignedBigInteger('line_total_cents');           // what the customer pays for the line
            $table->string('status')->default('pending');
            $table->unsignedBigInteger('station_id')->nullable(); // FK added in Phase 4
            $table->string('notes')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('voided_at')->nullable();
            $table->string('void_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
