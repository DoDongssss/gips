<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: reports
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('x_reports', function (Blueprint $table) {
            $table->id();
            $table->date('business_date');
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->json('snapshot');
            $table->dateTime('generated_at');
            $table->timestamps();

            $table->index('business_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('x_reports');
    }
};
