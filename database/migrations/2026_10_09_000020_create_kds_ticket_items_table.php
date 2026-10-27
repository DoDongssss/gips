<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kitchen
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kds_ticket_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kds_ticket_id')->constrained('kds_tickets')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->restrictOnDelete();
            $table->string('name'); // snapshot
            $table->unsignedSmallInteger('quantity');
            $table->text('modifiers_summary')->nullable();
            $table->string('notes')->nullable();
            $table->string('status')->default('new'); // new, preparing, ready, bumped
            $table->dateTime('ready_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kds_ticket_items');
    }
};
