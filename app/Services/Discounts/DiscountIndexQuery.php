<?php

namespace App\Services\Discounts;

use App\Enums\DiscountScope;
use App\Enums\DiscountType;
use App\Models\Discount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared filters and query for the discounts catalog list. */
class DiscountIndexQuery
{
    private const SORTABLE = ['name', 'code', 'value', 'is_active'];

    /**
     * @return array{
     *     search: string,
     *     status: string,
     *     type: string,
     *     applies_to: string,
     *     sort: ?string,
     *     direction: ?string,
     * }
     */
    public function filters(Request $request): array
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return [
            'search' => trim((string) $request->query('search', '')),
            'status' => in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : '',
            'type' => $this->enumValue($request->query('type'), DiscountType::class),
            'applies_to' => $this->enumValue($request->query('applies_to'), DiscountScope::class),
            'sort' => $sort,
            'direction' => $sort ? $direction : null,
        ];
    }

    /**
     * @param  class-string<\BackedEnum>  $enumClass
     */
    private function enumValue(mixed $raw, string $enumClass): string
    {
        if (! is_string($raw) || $raw === '') {
            return '';
        }

        foreach ($enumClass::cases() as $case) {
            if ($case->value === $raw) {
                return $raw;
            }
        }

        return '';
    }

    /** @param  array<string, mixed>  $filters */
    public function baseQuery(array $filters): Builder
    {
        $query = Discount::query();

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(
                fn ($w) => $w->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
            );
        }

        if ($filters['status'] === 'active') {
            $query->where('is_active', true);
        } elseif ($filters['status'] === 'inactive') {
            $query->where('is_active', false);
        }

        if ($filters['type'] !== '') {
            $query->where('type', $filters['type']);
        }

        if ($filters['applies_to'] !== '') {
            $query->where('applies_to', $filters['applies_to']);
        }

        return $query;
    }

    /** @param  array<string, mixed>  $filters */
    public function sorted(Builder $query, array $filters): Builder
    {
        $sort = $filters['sort'];
        $direction = $filters['direction'] ?? 'asc';

        if ($sort) {
            return $query->orderBy($sort, $direction)->orderBy('id');
        }

        return $query->orderByDesc('is_active')->orderBy('name');
    }
}
