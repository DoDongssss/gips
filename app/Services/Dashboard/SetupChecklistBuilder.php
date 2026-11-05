<?php

namespace App\Services\Dashboard;

use App\Models\Configuration;
use App\Models\Device;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Tax;
use App\Models\User;
use App\Services\Configuration\ConfigurationService;

class SetupChecklistBuilder
{
    public function __construct(private ConfigurationService $configuration) {}

    /**
     * @return array{
     *     complete: bool,
     *     completed_count: int,
     *     total_count: int,
     *     steps: array<int, array{key: string, label: string, description: string, done: bool, href: string|null}>
     * }
     */
    public function build(): array
    {
        $steps = [
            [
                'key' => 'business',
                'label' => 'Store details',
                'description' => 'Add your business name, address, and TIN for receipts.',
                'done' => $this->storeDetailsComplete(),
                'href' => route('configurations.index'),
            ],
            [
                'key' => 'tax',
                'label' => 'Tax rate',
                'description' => 'Confirm the tax that applies to menu prices.',
                'done' => Tax::query()->where('is_active', true)->exists(),
                'href' => route('taxes.index'),
            ],
            [
                'key' => 'menu',
                'label' => 'Menu items',
                'description' => 'Add at least one product you can sell at the register.',
                'done' => Product::query()->where('is_active', true)->exists(),
                'href' => route('menu.products.index'),
            ],
            [
                'key' => 'staff',
                'label' => 'Staff accounts',
                'description' => 'Create cashier or manager logins (and PINs for floor staff).',
                'done' => User::query()->count() >= 2,
                'href' => route('users.index'),
            ],
            [
                'key' => 'shift',
                'label' => 'First cash shift',
                'description' => 'Open a shift once so cashiers know the workflow.',
                'done' => Shift::query()->exists(),
                'href' => route('shifts.index'),
            ],
            [
                'key' => 'device',
                'label' => 'Kiosk or kitchen device',
                'description' => 'Pair a kiosk tablet or kitchen screen (optional but recommended).',
                'done' => Device::query()->where('is_active', true)->exists(),
                'href' => route('devices.index'),
            ],
            [
                'key' => 'payments',
                'label' => 'Payment instructions',
                'description' => 'Tell staff and kiosk customers how paying works (counter vs e-wallet reference).',
                'done' => Configuration::query()->where('key', 'payments_kiosk_instructions')->whereNotNull('value')->where('value', '!=', '')->exists(),
                'href' => route('configurations.index'),
            ],
        ];

        $completed = collect($steps)->where('done', true)->count();

        return [
            'complete' => $completed === count($steps),
            'completed_count' => $completed,
            'total_count' => count($steps),
            'steps' => $steps,
        ];
    }

    private function storeDetailsComplete(): bool
    {
        foreach (['business_name', 'business_address', 'business_tin'] as $key) {
            $value = trim((string) ($this->configuration->get($key) ?? ''));

            if ($value === '') {
                return false;
            }
        }

        return true;
    }
}
