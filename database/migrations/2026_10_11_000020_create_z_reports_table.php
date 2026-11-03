<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Feature: reports
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('z_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_number')->unique();
            $table->date('business_date')->unique(); // one Z report closes one business day
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('orders_count');
            foreach (['gross_sales', 'discounts', 'refunds', 'net_sales', 'tax', 'opening_cash', 'expected_cash', 'counted_cash'] as $money) {
                $table->bigInteger("{$money}_cents")->default(0);
            }
            $table->bigInteger('variance_cents')->default(0);
            $table->json('payments_breakdown');
            $table->json('snapshot'); // voids, per-shift cash, anything the printout shows
            $table->dateTime('generated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('z_reports');
    }
};
