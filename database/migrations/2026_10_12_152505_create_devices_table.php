<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // pos, kiosk, kds
            $table->uuid('identifier')->unique();
            $table->foreignId('station_id')->nullable()->constrained('stations')->nullOnDelete();
            $table->string('pairing_code_hash')->nullable()->index();
            $table->dateTime('pairing_expires_at')->nullable();
            $table->dateTime('paired_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_seen_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('app_version')->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
