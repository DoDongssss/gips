<?php

namespace App\Http\Controllers;

use App\Services\AuditLogs\AuditLogIndexQuery;
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

    public function __construct(private AuditLogIndexQuery $query) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:audit.view'),
        ];
    }

    public function index(Request $request): Response
    {
        $actor = $request->user();
        $filters = $this->query->filters($request);
        $hiddenIds = $this->query->hiddenSuperadminUserIds($actor);

        return Inertia::render('audit-logs/index', [
            'logs' => Inertia::optional(function () use ($filters, $hiddenIds) {
                $builder = $this->query->sorted($this->query->baseQuery($filters, $hiddenIds), $filters);

                return $builder
                    ->paginate(AuditLogIndexQuery::PER_PAGE)
                    ->withQueryString()
                    ->through(fn (Activity $activity) => $this->present($activity));
            }),

            'options' => Inertia::optional(fn () => $this->query->filterOptions($hiddenIds)),

            'filters' => $filters,
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

        return $attributes['name'] ?? $attributes['key'] ?? $attributes['order_number'] ?? null;
    }
}
