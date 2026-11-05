<?php

namespace App\Services\Customers;

use App\Models\Customer;
use Illuminate\Support\Collection;

class CustomerService
{
    /**
     * @return Collection<int, Customer>
     */
    public function search(?string $query, int $limit = 15): Collection
    {
        $query = trim((string) $query);

        if ($query === '') {
            return collect();
        }

        $digits = preg_replace('/\D+/', '', $query) ?? '';

        return Customer::query()
            ->where(function ($builder) use ($query, $digits) {
                $builder->where('name', 'like', "%{$query}%");

                if ($digits !== '') {
                    $builder->orWhere('phone', 'like', "%{$digits}%");
                }

                $builder->orWhere('email', 'like', "%{$query}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function normalizeCartInput(array $input): array
    {
        $customerId = isset($input['customer_id']) ? (int) $input['customer_id'] : null;

        if ($customerId) {
            $customer = Customer::query()->find($customerId);

            if ($customer) {
                $input['customer_id'] = $customer->id;
                $input['customer_name'] = $customer->name;

                return $input;
            }

            unset($input['customer_id']);
        }

        $phone = isset($input['customer_phone']) ? $this->normalizePhone((string) $input['customer_phone']) : null;
        $name = trim((string) ($input['customer_name'] ?? ''));

        if ($phone !== null && $phone !== '') {
            $customer = Customer::query()->firstOrCreate(
                ['phone' => $phone],
                ['name' => $name !== '' ? $name : "Guest {$phone}"],
            );

            if ($name !== '' && $customer->name !== $name) {
                $customer->update(['name' => $name]);
            }

            $input['customer_id'] = $customer->id;
            $input['customer_name'] = $customer->name;

            return $input;
        }

        unset($input['customer_id'], $input['customer_phone']);

        $input['customer_name'] = $name !== '' ? $name : null;

        return $input;
    }

    public function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        return $digits !== '' ? $digits : null;
    }

    /**
     * Resolve an existing customer for pricing previews without creating a record.
     *
     * @param  array<string, mixed>  $input
     */
    public function resolveForLoyalty(array $input): ?Customer
    {
        $customerId = isset($input['customer_id']) ? (int) $input['customer_id'] : null;

        if ($customerId) {
            return Customer::query()->find($customerId);
        }

        $phone = isset($input['customer_phone']) ? $this->normalizePhone((string) $input['customer_phone']) : null;

        if ($phone) {
            return Customer::query()->where('phone', $phone)->first();
        }

        return null;
    }
}
