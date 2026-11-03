<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: system
return new class extends Migration
{
    public function up(): void
    {
        // A counter for sequential document numbers (receipts, Z reports, purchase orders).
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
    }
};
