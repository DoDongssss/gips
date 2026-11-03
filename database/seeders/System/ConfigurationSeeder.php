<?php

namespace Database\Seeders\System;

use App\Models\Configuration;
use App\Services\ConfigurationService;
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
                    'value' => $this->stringify($row['value']),
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
                'business_name' => ['type' => 'string', 'value' => 'My Coffee Shop'],
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
            ],

            'kitchen' => [
                'kitchen_warning_minutes' => ['type' => 'int', 'value' => 5],
                'kitchen_late_minutes' => ['type' => 'int', 'value' => 10],
            ],

        ];
    }

    private function stringify(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return (string) $value;
    }
}
