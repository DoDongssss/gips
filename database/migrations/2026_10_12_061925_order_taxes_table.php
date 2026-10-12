<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->string('name');             // snapshot
            $table->decimal('rate', 6, 4);      // snapshot
            $table->boolean('is_inclusive');
            // Net amount the tax was charged on ("VATable sales" when tax is inclusive).
            $table->unsignedBigInteger('taxable_cents');
            $table->unsignedBigInteger('tax_cents');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_taxes');
    }
};
