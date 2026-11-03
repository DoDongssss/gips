<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller implements HasMiddleware
{
    /** Never shown, even if one of these ever ended up in a log entry. */
    private const REDACTED = [
        'password',
        'pin',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    public static function middleware(): array
    {
        return [
            new Middleware('permission:audit.view'),
        ];
    }

    /** Columns the table may sort by: query name => database column. */
    private const SORTABLE = ['created_at' => 'created_at', 'log' => 'log_name', 'event' => 'event'];

    private const PER_PAGE = 20;

    public function index(Request $request): Response
    {
        $actor = $request->user();

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'log' => ['nullable', 'string', 'max:100'],
            'event' => ['nullable', 'string', 'max:100'],
            'user' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'sort' => ['nullable', 'string', 'in:'.implode(',', array_keys(self::SORTABLE))],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $sort = $filters['sort'] ?? null;
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        // Only a superadmin can see what other superadmins did or what was done to them.
        $hiddenIds = $actor->hasRole('superadmin')
            ? collect()
            : User::role('superadmin')->pluck('id');

        return Inertia::render('audit-logs/index', [
            // Optional: not queried on the first render. The page asks for it
            // with a partial reload (only: ['logs', 'options', 'filters']).
            'logs' => Inertia::optional(fn () => Activity::query()
                ->with(['causer', 'subject'])
                ->when($hiddenIds->isNotEmpty(), function ($query) use ($hiddenIds) {
                    $query
                        ->where(fn ($q) => $q->whereNull('causer_id')
                            ->orWhere('causer_type', '!=', User::class)
                            ->orWhereNotIn('causer_id', $hiddenIds))
                        ->where(fn ($q) => $q->whereNull('subject_id')
                            ->orWhere('subject_type', '!=', User::class)
                            ->orWhereNotIn('subject_id', $hiddenIds));
                })
                ->when($filters['search'] ?? null, fn ($q, $value) => $q->where('description', 'like', "%{$value}%"))
                ->when($filters['log'] ?? null, fn ($q, $value) => $q->where('log_name', $value))
                ->when($filters['event'] ?? null, fn ($q, $value) => $q->where('event', $value))
                ->when($filters['user'] ?? null, fn ($q, $value) => $q->where('causer_type', User::class)->where('causer_id', $value))
                ->when($filters['from'] ?? null, fn ($q, $value) => $q->whereDate('created_at', '>=', $value))
                ->when($filters['to'] ?? null, fn ($q, $value) => $q->whereDate('created_at', '<=', $value))
                ->when(
                    $sort,
                    fn ($q) => $q->orderBy(self::SORTABLE[$sort], $direction)->orderBy('id', $direction),
                    fn ($q) => $q->latest('id'),
                )
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Activity $activity) => $this->present($activity))),

            // Dropdown choices need distinct() scans of the log, so they load with the table.
            'options' => Inertia::optional(fn () => [
                'logs' => Activity::query()->whereNotNull('log_name')->distinct()->orderBy('log_name')->pluck('log_name'),
                'events' => Activity::query()->whereNotNull('event')->distinct()->orderBy('event')->pluck('event'),
                'users' => User::query()
                    ->whereIn('id', Activity::query()->where('causer_type', User::class)->select('causer_id'))
                    ->when($hiddenIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $hiddenIds))
                    ->orderBy('name')
                    ->get(['id', 'name']),
            ]),

            'filters' => array_merge(
                ['search' => '', 'log' => '', 'event' => '', 'user' => '', 'from' => '', 'to' => ''],
                collect($filters)->except(['sort', 'direction'])->map(fn ($value) => (string) $value)->all(),
                ['sort' => $sort, 'direction' => $sort ? $direction : null],
            ),
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Activity $activity): array
    {
        $changes = $activity->attribute_changes?->toArray() ?? [];
        $new = Arr::except($changes['attributes'] ?? [], self::REDACTED);
        $old = Arr::except($changes['old'] ?? [], self::REDACTED);

        $fields = collect(array_keys($old + $new))
            ->map(fn ($field) => [
                'field' => $field,
                'old' => $old[$field] ?? null,
                'new' => $new[$field] ?? null,
            ])
            ->values()
            ->all();

        $properties = collect($activity->properties)->toArray();

        return [
            'id' => $activity->id,
            'created_at' => $activity->created_at?->toIso8601String(),
            'log' => $activity->log_name,
            'event' => $activity->event,
            'description' => $activity->description,
            'causer' => $activity->causer?->name,
            'subject_type' => $activity->subject_type ? Str::headline(class_basename($activity->subject_type)) : null,
            'subject_name' => $this->subjectName($activity),
            'ip' => $properties['ip'] ?? null,
            'user_agent' => $properties['user_agent'] ?? null,
            'changes' => $fields,
            'details' => Arr::except($properties, ['ip', 'user_agent']),
        ];
    }

    private function subjectName(Activity $activity): ?string
    {
        $subject = $activity->subject;

        if ($subject === null) {
            return null;
        }

        $attributes = $subject->getAttributes();

        return $attributes['name'] ?? $attributes['key'] ?? null;
    }
}