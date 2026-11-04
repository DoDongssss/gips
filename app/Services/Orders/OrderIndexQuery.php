<?php

namespace App\Services\Orders;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Support\BusinessDate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared filters for the orders list and CSV export. */
class OrderIndexQuery
{
    private const SORTABLE = ['order_number', 'status', 'payment_status', 'total_cents', 'created_at'];

    /**
     * @return array{
     *     date: string,
     *     date_end: string,
     *     search: string,
     *     status: string,
     *     payment_status: string,
     *     channel: string,
     *     type: string,
     *     sort: ?string,
     *     direction: ?string,
     *     highlight: ?int,
     * }
     */
    public function filters(Request $request): array
    {
        $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'date_end' => ['nullable', 'date_format:Y-m-d'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'highlight' => ['nullable', 'integer'],
        ]);

        $date = $request->query('date');
        $date = is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : BusinessDate::current();

        $dateEnd = $request->query('date_end');
        $dateEnd = is_string($dateEnd) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateEnd) ? $dateEnd : $date;
        if ($dateEnd < $date) {
            [$date, $dateEnd] = [$dateEnd, $date];
        }

        $sort = in_array($request->query('sort'), self::SORTABLE, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return [
            'date' => $date,
            'date_end' => $dateEnd,
            'search' => trim((string) $request->query('search', '')),
            'status' => $this->enumValue($request->query('status'), OrderStatus::class),
            'payment_status' => $this->enumValue($request->query('payment_status'), PaymentStatus::class),
            'channel' => $this->enumValue($request->query('channel'), OrderChannel::class),
            'type' => $this->enumValue($request->query('type'), OrderType::class),
            'sort' => $sort,
            'direction' => $sort ? $direction : null,
            'highlight' => $request->integer('highlight') ?: null,
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
        $query = Order::query()
            ->whereBetween('business_date', [$filters['date'], $filters['date_end']]);

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(
                fn ($w) => $w->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
            );
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['payment_status'] !== '') {
            $query->where('payment_status', $filters['payment_status']);
        }

        if ($filters['channel'] !== '') {
            $query->where('channel', $filters['channel']);
        }

        if ($filters['type'] !== '') {
            $query->where('type', $filters['type']);
        }

        return $query;
    }

    /** @param  array<string, mixed>  $filters */
    public function sorted(Builder $query, array $filters): Builder
    {
        $sort = $filters['sort'];
        $direction = $filters['direction'] ?? 'asc';

        if ($sort) {
            return $query->orderBy($sort, $direction)->orderByDesc('id');
        }

        return $query->latest('id');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{count: int, total_cents: int, paid_cents: int, discount_cents: int, void_count: int}
     */
    public function summary(array $filters): array
    {
        $row = $this->baseQuery($filters)
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(total_cents), 0) as total_cents')
            ->selectRaw('COALESCE(SUM(paid_cents), 0) as paid_cents')
            ->selectRaw('COALESCE(SUM(discount_cents), 0) as discount_cents')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as void_count', [OrderStatus::Voided->value])
            ->first();

        return [
            'count' => (int) $row->count,
            'total_cents' => (int) $row->total_cents,
            'paid_cents' => (int) $row->paid_cents,
            'discount_cents' => (int) $row->discount_cents,
            'void_count' => (int) $row->void_count,
        ];
    }
}
