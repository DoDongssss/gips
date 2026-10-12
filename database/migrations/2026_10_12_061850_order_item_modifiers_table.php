<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_item_modifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('modifier_id')->nullable()->constrained('modifiers')->nullOnDelete();
            $table->string('group_name');
            $table->string('modifier_name');
            $table->bigInteger('price_delta_cents'); // signed snapshot
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_modifiers');
    }
};
