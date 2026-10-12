<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->string('type');             // percent | fixed
            $table->unsignedInteger('value');   // basis points for percent, centavos for fixed
            $table->string('applies_to');       // order | item
            $table->boolean('requires_id')->default(false);
            $table->boolean('requires_approval')->default(false);
            $table->boolean('is_vat_exempt')->default(false);
            $table->boolean('is_active')->default(true);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discounts');
    }
};
