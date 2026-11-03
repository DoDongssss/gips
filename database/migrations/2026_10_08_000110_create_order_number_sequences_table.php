<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: orders
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
    }

    public function down(): void
    {
        Schema::dropIfExists('order_number_sequences');
    }
};
