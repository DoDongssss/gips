<?php

namespace App\Services\Shifts;

use App\Enums\ShiftStatus;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Filters and queries for closed shift history. */
class ShiftIndexQuery
{
    public const PER_PAGE = 25;

    /** @var array<string, string> */
    private const SORTABLE = ['closed_at' => 'closed_at', 'opened_at' => 'opened_at', 'variance_cents' => 'variance_cents'];

    /**
     * @return array{
     *     search: string,
     *     from: string,
     *     to: string,
     *     user: string,
     *     variance: string,
     *     sort: ?string,
     *     direction: ?string,
     * }
     */
    public function filters(Request $request): array
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'user' => ['nullable', 'integer'],
            'variance' => ['nullable', Rule::in(['balanced', 'short', 'over'])],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTABLE))],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $sort = in_array($request->query('sort'), array_keys(self::SORTABLE), true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';

        return [
            'search' => trim((string) $request->query('search', '')),
            'from' => $request->query('from') ? (string) $request->date('from')->toDateString() : '',
            'to' => $request->query('to') ? (string) $request->date('to')->toDateString() : '',
            'user' => $request->query('user') ? (string) $request->integer('user') : '',
            'variance' => in_array($request->query('variance'), ['balanced', 'short', 'over'], true)
                ? $request->query('variance')
                : '',
            'sort' => $sort,
            'direction' => $sort ? $direction : null,
        ];
    }

    /** @param  array<string, mixed>  $filters */
    public function historyQuery(array $filters, User $viewer, bool $canViewAll): Builder
    {
        $query = Shift::query()
            ->with(['user:id,name', 'movements.user:id,name'])
            ->where('status', ShiftStatus::Closed);

        if (! $canViewAll) {
            $query->where('user_id', $viewer->id);
        } elseif ($filters['user'] !== '') {
            $query->where('user_id', (int) $filters['user']);
        }

        if ($filters['from'] !== '') {
            $query->whereDate('business_date', '>=', $filters['from']);
        }

        if ($filters['to'] !== '') {
            $query->whereDate('business_date', '<=', $filters['to']);
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(
                fn ($q) => $q->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"))
            );
        }

        match ($filters['variance']) {
            'balanced' => $query->where('variance_cents', 0),
            'short' => $query->where('variance_cents', '<', 0),
            'over' => $query->where('variance_cents', '>', 0),
            default => null,
        };

        return $query;
    }

    /** @param  array<string, mixed>  $filters */
    public function sorted(Builder $query, array $filters): Builder
    {
        $sort = $filters['sort'];
        $direction = $filters['direction'] ?? 'desc';

        if ($sort) {
            return $query->orderBy(self::SORTABLE[$sort], $direction)->orderBy('id', $direction);
        }

        return $query->latest('closed_at')->latest('id');
    }

    /** @return Collection<int, User> */
    public function cashierOptions(bool $canViewAll): Collection
    {
        if (! $canViewAll) {
            return User::query()->whereRaw('0=1')->get(['id', 'name']);
        }

        return User::query()
            ->whereIn('id', Shift::query()->select('user_id'))
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}
