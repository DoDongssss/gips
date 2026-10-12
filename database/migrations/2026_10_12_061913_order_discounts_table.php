<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('discount_id')->nullable()->constrained('discounts')->nullOnDelete();
            $table->string('name');            // snapshot
            $table->string('type');            // percent | fixed
            $table->unsignedInteger('value');  // basis points or centavos
            // For a VAT-exempt discount this INCLUDES the VAT that was removed.
            $table->unsignedBigInteger('amount_cents');
            $table->string('id_number')->nullable(); // senior / PWD ID
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_discounts');
    }
};
