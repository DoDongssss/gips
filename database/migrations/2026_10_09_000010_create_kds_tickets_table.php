<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: kitchen
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kds_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('station_id')->constrained('stations')->restrictOnDelete();
            $table->unsignedSmallInteger('ticket_number');
            $table->string('status')->default('new'); // new, preparing, ready, bumped, cancelled
            $table->unsignedTinyInteger('priority')->default(0);
            $table->dateTime('fired_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('ready_at')->nullable();
            $table->dateTime('bumped_at')->nullable();
            $table->foreignId('bumped_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['station_id', 'status']);
            $table->unique(['order_id', 'station_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kds_tickets');
    }
};
