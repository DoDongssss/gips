<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->unique()->constrained('devices')->cascadeOnDelete();
            $table->string('language', 8)->default('en');
            $table->string('theme')->nullable();
            $table->string('payment_mode')->default('pay_at_counter'); // pay_at_counter, pay_at_kiosk (later)
            $table->unsignedInteger('idle_timeout_seconds')->default(60);
            $table->boolean('upsell_enabled')->default(true);
            $table->boolean('large_text')->default(false);
            $table->boolean('is_out_of_service')->default(false);
            $table->string('welcome_message')->nullable();
            $table->timestamps();
        });

        Schema::create('kiosk_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique(); // the kiosk sends it back when it places the order: one session, one order
            $table->foreignId('device_id')->constrained('devices')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('status')->default('active'); // active, completed, abandoned, timed_out
            $table->string('language', 8)->default('en');
            $table->unsignedInteger('items_count')->default(0);
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'started_at']);
        });

        Schema::create('kiosk_heartbeats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->string('status')->default('online'); // online, busy, error
            $table->string('app_version')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });

        Schema::create('kiosk_screens', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type')->default('promo'); // welcome, promo, banner
            $table->string('image_path')->nullable();
            $table->json('content')->nullable(); // { "headline": "...", "subtext": "..." }
            $table->integer('sort_order')->default(0);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('upsell_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trigger_product_id')->nullable()->constrained('products')->cascadeOnDelete();
            $table->foreignId('trigger_category_id')->nullable()->constrained('categories')->cascadeOnDelete();
            $table->foreignId('suggested_product_id')->constrained('products')->cascadeOnDelete();
            $table->string('channel')->default('all'); // all, pos, kiosk
            $table->string('message')->nullable();
            $table->integer('priority')->default(0); // higher is shown first
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // The device columns already exist on these tables; this adds the foreign keys the DB doc promised for phase 7.
        foreach (['orders', 'payments', 'shifts'] as $name) {
            if (Schema::hasColumn($name, 'device_id')) {
                Schema::table($name, fn (Blueprint $table) => $table->foreign('device_id')->references('id')->on('devices')->nullOnDelete());
            }
        }
    }

    public function down(): void
    {
        foreach (['orders', 'payments', 'shifts'] as $name) {
            if (Schema::hasColumn($name, 'device_id')) {
                Schema::table($name, fn (Blueprint $table) => $table->dropForeign(['device_id']));
            }
        }

        foreach (['upsell_rules', 'kiosk_screens', 'kiosk_heartbeats', 'kiosk_sessions', 'kiosk_settings'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
