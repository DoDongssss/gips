<?php

namespace Database\Seeders\System;

use App\Models\Configuration;
use App\Services\Configuration\ConfigurationService;
use App\Support\ConfigValue;
use Illuminate\Database\Seeder;

class ConfigurationSeeder extends Seeder
{
    /**
     * false: only creates rows that do not exist yet, so re-running never overwrites
     *        changes the owner made on the Configurations page.
     * true:  resets every row to the values written below each time the seeder runs.
     */
    private const OVERWRITE_EXISTING = false;

    public function run(): void
    {
        foreach ($this->configurations() as $group => $rows) {
            foreach ($rows as $key => $row) {
                $attributes = [
                    'value' => ConfigValue::stringify($row['value']),
                    'group' => $group,
                    'type' => $row['type'],
                ];

                if (self::OVERWRITE_EXISTING) {
                    Configuration::updateOrCreate(['key' => $key], $attributes);
                } else {
                    Configuration::firstOrCreate(['key' => $key], $attributes);
                }
            }
        }

        // Clear the cached values so the new rows are used right away.
        app(ConfigurationService::class)->flush();
    }

    /**
     * Every configuration row, grouped.
     *
     * To add or change data manually, edit this list. Keep each key identical to the
     * keys in config/configurations.php, because that file decides which fields
     * appear on the Configurations page.
     *
     * Types: string, text, int, decimal, bool.
     * Booleans are written as true or false and stored as '1' or '0'.
     * Use null for an empty value.
     *
     * @return array<string, array<string, array{type: string, value: string|int|float|bool|null}>>
     */
    private function configurations(): array
    {
        return [

            'business' => [
                'business_name' => ['type' => 'string', 'value' => app()->isProduction() ? config('app.name') : 'My Coffee Shop'],
                'business_address' => ['type' => 'text', 'value' => null],
                'business_phone' => ['type' => 'string', 'value' => null],
                'business_tin' => ['type' => 'string', 'value' => null],
            ],

            'receipt' => [
                'receipt_header' => ['type' => 'text', 'value' => null],
                'receipt_footer' => ['type' => 'text', 'value' => 'Thank you for your purchase!'],
            ],

            'orders' => [
                'orders_pickup_prefix' => ['type' => 'string', 'value' => null],
                'orders_cutoff_hour' => ['type' => 'int', 'value' => 4],
            ],

            'shifts' => [
                'shifts_require_open_shift' => ['type' => 'bool', 'value' => true],
                'shifts_variance_attention_cents' => ['type' => 'int', 'value' => 5000],
            ],

            'payments' => [
                'payments_kiosk_instructions' => ['type' => 'text', 'value' => 'Pay at the counter with cash, GCash, Maya, or card. Show your pickup number to the cashier.'],
                'payments_pos_ewallet_help' => ['type' => 'text', 'value' => 'For GCash, Maya, or bank transfer, enter the amount and the reference number from the customer\'s app.'],
            ],

            'loyalty' => [
                'loyalty_enabled' => ['type' => 'bool', 'value' => true],
                'loyalty_cents_per_point' => ['type' => 'int', 'value' => 10000],
                'loyalty_redeem_centavos_per_point' => ['type' => 'int', 'value' => 10000],
            ],

            'kitchen' => [
                'kitchen_warning_minutes' => ['type' => 'int', 'value' => 5],
                'kitchen_late_minutes' => ['type' => 'int', 'value' => 10],
            ],

        ];
    }
}
