import { Form } from '@inertiajs/react';

import ConfigurationController from '@/actions/App/Http/Controllers/ConfigurationController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SettingField = {
    name: string;
    label: string;
    type: 'string' | 'text' | 'int' | 'decimal' | 'bool';
    help: string | null;
    min: number | null;
    max: number | null;
    step: number | null;
    value: string | number | boolean | null;
};

export type SettingGroup = {
    key: string;
    label: string;
    description: string | null;
    fields: SettingField[];
};

const textareaClass =
    'border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

function FieldControl({ field, error, disabled }: { field: SettingField; error?: string; disabled: boolean }) {
    const id = `setting-${field.name}`;

    if (field.type === 'bool') {
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <input
                        id={id}
                        name={field.name}
                        type="checkbox"
                        value="1"
                        defaultChecked={Boolean(field.value)}
                        disabled={disabled}
                        className="size-4"
                    />
                    <Label htmlFor={id}>{field.label}</Label>
                </div>
                {field.help && !error && <p className="text-muted-foreground text-xs">{field.help}</p>}
                {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{field.label}</Label>

            {field.type === 'text' ? (
                <textarea
                    id={id}
                    name={field.name}
                    defaultValue={(field.value as string | null) ?? ''}
                    disabled={disabled}
                    className={textareaClass}
                />
            ) : (
                <Input
                    id={id}
                    name={field.name}
                    type={field.type === 'int' || field.type === 'decimal' ? 'number' : 'text'}
                    min={field.min ?? undefined}
                    max={field.max ?? undefined}
                    step={field.step ?? undefined}
                    defaultValue={field.value === null ? '' : String(field.value)}
                    disabled={disabled}
                    autoComplete="off"
                />
            )}

            {field.help && !error && <p className="text-muted-foreground text-xs">{field.help}</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

export default function SettingsGroupForm({ group, canUpdate }: { group: SettingGroup; canUpdate: boolean }) {
    return (
        <section className="space-y-4 rounded-lg border p-5">
            <div>
                <h2 className="font-semibold">{group.label}</h2>
                {group.description && <p className="text-muted-foreground text-sm">{group.description}</p>}
            </div>

            <Form {...ConfigurationController.update.form(group.key)} options={{ preserveScroll: true }} className="space-y-4">
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        {group.fields.map((field) => (
                            <FieldControl
                                key={field.name}
                                field={field}
                                error={errors[field.name]}
                                disabled={!canUpdate}
                            />
                        ))}

                        {canUpdate && (
                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : `Save ${group.label.toLowerCase()} settings`}
                                </Button>
                                {recentlySuccessful && <span className="text-muted-foreground text-sm">Saved</span>}
                            </div>
                        )}
                    </>
                )}
            </Form>
        </section>
    );
}