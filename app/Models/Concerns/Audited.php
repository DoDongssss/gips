<?php

namespace App\Models\Concerns;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

trait Audited
{
    use LogsActivity;

    /** The attributes whose changes are recorded. Never list passwords, PINs or tokens. */
    abstract protected function auditAttributes(): array;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName($this->auditLogName())
            ->logOnly($this->auditAttributes())
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->setDescriptionForEvent(
                fn ($event) => $this->auditLabel().' '.$this->auditEventName($event).': '.$this->auditSubjectName(),
            );
    }

    /**
     * Called by the package just before an activity is saved.
     * Adds where the change came from. Skipped for seeders and console commands.
     */
    public function beforeActivityLogged(ActivityContract $activity, mixed $event = null): void
    {
        if (app()->runningInConsole()) {
            return;
        }

        $activity->properties = collect($activity->properties)->merge([
            'ip' => request()->ip(),
            'user_agent' => Str::limit((string) request()->userAgent(), 255, ''),
        ]);
    }

    /** The log name used to group entries, for example "user" or "configuration". */
    protected function auditLogName(): string
    {
        return Str::snake(class_basename($this));
    }

    /** A readable model name used in descriptions, for example "User". */
    protected function auditLabel(): string
    {
        return Str::headline(class_basename($this));
    }

    /** What to call this record in descriptions. Override when the model has no name column. */
    protected function auditSubjectName(): string
    {
        return (string) Arr::get($this->getAttributes(), 'name', $this->getKey());
    }

    private function auditEventName(mixed $event): string
    {
        return $event instanceof \BackedEnum ? (string) $event->value : (string) $event;
    }
}