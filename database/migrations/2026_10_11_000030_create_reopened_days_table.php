<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: reports
return new class extends Migration
{
    /** Days whose Z report was removed on purpose. Only the shifts of these days may be reopened. */
    public function up(): void
    {
        Schema::create('reopened_days', function (Blueprint $table) {
            $table->id();
            $table->date('business_date')->unique();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reopened_days');
    }
};
