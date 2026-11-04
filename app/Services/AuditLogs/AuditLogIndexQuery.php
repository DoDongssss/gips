<?php

namespace App\Services\AuditLogs;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Spatie\Activitylog\Models\Activity;

/** Filters and query for the audit log index. */
class AuditLogIndexQuery
{
    public const PER_PAGE = 25;

    /** @var array<string, string> */
    private const SORTABLE = ['created_at' => 'created_at', 'log' => 'log_name', 'event' => 'event'];

    /**
     * @return array{
     *     search: string,
     *     log: string,
     *     event: string,
     *     user: string,
     *     from: string,
     *     to: string,
     *     sort: ?string,
     *     direction: ?string,
     * }
     */
    public function filters(Request $request): array
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'log' => ['nullable', 'string', 'max:100'],
            'event' => ['nullable', 'string', 'max:100'],
            'user' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTABLE))],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $sort = in_array($request->query('sort'), array_keys(self::SORTABLE), true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';

        return [
            'search' => trim((string) $request->query('search', '')),
            'log' => trim((string) $request->query('log', '')),
            'event' => trim((string) $request->query('event', '')),
            'user' => $request->query('user') ? (string) $request->integer('user') : '',
            'from' => $request->query('from') ? (string) $request->date('from')->toDateString() : '',
            'to' => $request->query('to') ? (string) $request->date('to')->toDateString() : '',
            'sort' => $sort,
            'direction' => $sort ? $direction : null,
        ];
    }

    /** @return Collection<int, int> */
    public function hiddenSuperadminUserIds(User $actor): Collection
    {
        if ($actor->hasRole('superadmin')) {
            return collect();
        }

        return User::role('superadmin')->pluck('id');
    }

    /** @param  array<string, mixed>  $filters */
    public function baseQuery(array $filters, Collection $hiddenIds): Builder
    {
        $query = Activity::query()->with(['causer', 'subject']);

        if ($hiddenIds->isNotEmpty()) {
            $query
                ->where(fn ($q) => $q->whereNull('causer_id')
                    ->orWhere('causer_type', '!=', User::class)
                    ->orWhereNotIn('causer_id', $hiddenIds))
                ->where(fn ($q) => $q->whereNull('subject_id')
                    ->orWhere('subject_type', '!=', User::class)
                    ->orWhereNotIn('subject_id', $hiddenIds));
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where('description', 'like', "%{$search}%");
        }

        if ($filters['log'] !== '') {
            $query->where('log_name', $filters['log']);
        }

        if ($filters['event'] !== '') {
            $query->where('event', $filters['event']);
        }

        if ($filters['user'] !== '') {
            $query->where('causer_type', User::class)->where('causer_id', (int) $filters['user']);
        }

        if ($filters['from'] !== '') {
            $query->whereDate('created_at', '>=', $filters['from']);
        }

        if ($filters['to'] !== '') {
            $query->whereDate('created_at', '<=', $filters['to']);
        }

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

        return $query->latest('id');
    }

    /**
     * @return array{
     *     logs: Collection<int, string>,
     *     events: Collection<int, string>,
     *     users: \Illuminate\Database\Eloquent\Collection<int, User>,
     * }
     */
    public function filterOptions(Collection $hiddenIds): array
    {
        return [
            'logs' => Activity::query()->whereNotNull('log_name')->distinct()->orderBy('log_name')->pluck('log_name'),
            'events' => Activity::query()->whereNotNull('event')->distinct()->orderBy('event')->pluck('event'),
            'users' => User::query()
                ->whereIn('id', Activity::query()->where('causer_type', User::class)->select('causer_id'))
                ->when($hiddenIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $hiddenIds))
                ->orderBy('name')
                ->get(['id', 'name']),
        ];
    }
}
