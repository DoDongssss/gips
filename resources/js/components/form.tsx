import { Form, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import UserController from '@/actions/App/Http/Controllers/UserController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type UserFormUser = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    is_active: boolean;
    has_pin: boolean;
};

type Props = {
    formProps: { action: string; method: 'get' | 'post' };
    roles: string[];
    user?: UserFormUser;
    isSelf?: boolean;
    roleLocked?: boolean;
    submitLabel: string;
};

function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function form({
    formProps,
    roles,
    user,
    isSelf = false,
    roleLocked = false,
    submitLabel,
}: Props) {
    const editing = Boolean(user);

    return (
        <Form {...formProps} className="max-w-xl space-y-6">
            {({ processing, errors }) => (
                <>
                    <Field label="Name" htmlFor="name" error={errors.name}>
                        <Input id="name" name="name" defaultValue={user?.name} required autoComplete="off" />
                    </Field>

                    <Field label="Email" htmlFor="email" error={errors.email}>
                        <Input id="email" name="email" type="email" defaultValue={user?.email} required autoComplete="off" />
                    </Field>

                    <Field
                        label="Password"
                        htmlFor="password"
                        error={errors.password}
                        hint={editing ? 'Leave blank to keep the current password.' : undefined}
                    >
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required={!editing}
                            autoComplete="new-password"
                        />
                    </Field>

                    <Field
                        label="PIN (4 to 6 digits)"
                        htmlFor="pin"
                        error={errors.pin}
                        hint={
                            editing
                                ? user?.has_pin
                                    ? 'A PIN is set. Leave blank to keep it.'
                                    : 'No PIN set yet.'
                                : 'Used for quick login at the POS. Optional.'
                        }
                    >
                        <Input
                            id="pin"
                            name="pin"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete="off"
                        />
                    </Field>

                    {!roleLocked && (
                        <Field label="Role" htmlFor="role" error={errors.role}>
                            <select
                                id="role"
                                name="role"
                                defaultValue={user?.role ?? ''}
                                required
                                className={selectClass}
                            >
                                <option value="" disabled>
                                    Select a role
                                </option>
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {!isSelf && (
                        <div className="flex items-center gap-2">
                            <input
                                id="is_active"
                                name="is_active"
                                type="checkbox"
                                value="1"
                                defaultChecked={user ? user.is_active : true}
                                className="size-4"
                            />
                            <Label htmlFor="is_active">Active (can log in)</Label>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : submitLabel}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={UserController.index()}>Cancel</Link>
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}