<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('slug')->unique();
            $table->string('type')->default('other'); // bar, kitchen, pastry, other
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('category_stations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->unique()->constrained('categories')->cascadeOnDelete(); // one station per category
            $table->foreignId('station_id')->constrained('stations')->cascadeOnDelete();
            $table->timestamps();
        });

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
        Schema::dropIfExists('kds_tickets');
        Schema::dropIfExists('category_stations');
        Schema::dropIfExists('stations');
    }
};
