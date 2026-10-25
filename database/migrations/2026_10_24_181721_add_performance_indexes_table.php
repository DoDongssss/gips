<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the queries the register, kitchen, kiosk, reports and money code run all day.
 *
 * Safe to run on your database: each index is added only when the table and every column exist and no index
 * on exactly those columns is there yet. A column that is named differently in your tables is skipped, not an error.
 * Run `php artisan migrate --pretend` first to see which ones would be added.
 */
return new class extends Migration
{
    /** @var array<int, array{0:string,1:array<int,string>,2:string}> table, columns, short name */
    private array $indexes = [
        // Register "orders today", reports by day, "unpaid orders" lists, kiosk orders waiting at the counter.
        ['orders', ['business_date', 'status'], 'p8_orders_day_status'],
        ['orders', ['business_date', 'payment_status'], 'p8_orders_day_pay'],
        ['orders', ['channel', 'status', 'payment_status', 'created_at'], 'p8_orders_channel_flow'],
        ['orders', ['created_at'], 'p8_orders_created'],

        // Paying and refunding: what is left of an order's payments, sales per shift and per day.
        ['payments', ['order_id', 'status'], 'p8_payments_order_status'],
        ['payments', ['shift_id', 'status'], 'p8_payments_shift_status'],
        ['payments', ['paid_at'], 'p8_payments_paid_at'],
        ['refunds', ['payment_id', 'status'], 'p8_refunds_payment_status'],
        ['refunds', ['business_date'], 'p8_refunds_day'],

        // Kitchen board and item lists.
        ['order_items', ['order_id', 'status'], 'p8_items_order_status'],

        // Menu: active, available products of a category.
        ['products', ['category_id', 'is_active', 'is_available'], 'p8_products_menu'],

        // Stock: movements of one ingredient over time (history, reports, low-stock).
        ['stock_movements', ['ingredient_id', 'created_at'], 'p8_stock_ingredient_time'],

        // Kiosk: offline checks, stale sessions, upsell lookups.
        ['devices', ['type', 'is_active'], 'p8_devices_type_active'],
        ['kiosk_sessions', ['status', 'started_at'], 'p8_kiosk_sessions_status'],
        ['upsell_rules', ['is_active', 'channel'], 'p8_upsell_active_channel'],

        // Audit trail screens.
        ['audit_logs', ['event', 'created_at'], 'p8_audit_event_time'],
    ];

    public function up(): void
    {
        foreach ($this->indexes as [$table, $columns, $name]) {
            if (! $this->canIndex($table, $columns)) {
                continue;
            }

            Schema::table($table, fn (Blueprint $t) => $t->index($columns, $name));
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as [$table, $columns, $name]) {
            if (! Schema::hasTable($table) || ! Schema::hasIndex($table, $name)) {
                continue;
            }

            if (! Schema::hasIndex($table, [$columns[0]])) {
                Schema::table($table, fn (Blueprint $t) => $t->index($columns[0]));
            }

            Schema::table($table, fn (Blueprint $t) => $t->dropIndex($name));
        }
    }

    private function canIndex(string $table, array $columns): bool
    {
        return Schema::hasTable($table)
            && Schema::hasColumns($table, $columns)
            && ! Schema::hasIndex($table, $columns);
    }
};