<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->date('business_date')->unique();
            $table->unsignedInteger('last_number')->default(0);
            $table->string('prefix', 4)->default('');
            $table->timestamps();
        });

        // Small addition to the data dictionary: a counter for sequential receipt numbers
        // (Phase 5 reuses it for Z reports, Phase 6 for purchase orders).
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
        Schema::dropIfExists('order_number_sequences');
    }
};
