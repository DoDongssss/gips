import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';

import UserController from '@/actions/App/Http/Controllers/UserController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CredentialReset from '@/pages/users/credential-reset';

export type UserRecord = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    is_active: boolean;
    has_pin: boolean;
    is_self: boolean;
    role_locked: boolean;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The identifier: 'create' adds a user, 'edit' updates the given user. */
    mode: 'create' | 'edit';
    user?: UserRecord;
    roles: string[];
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

export default function FormDialog({ open, onOpenChange, mode, user, roles }: Props) {
    const target = mode === 'edit' ? user : undefined;
    const editing = target !== undefined;

    const formProps = target ? UserController.update.form(target.id) : UserController.store.form();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editing ? `Edit ${target.name}` : 'Add user'}</DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Update this staff account. Leave password and PIN blank to keep them.'
                            : 'Create a staff account and choose what they can do.'}
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...formProps}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <Field label="Name" htmlFor="name" error={errors.name}>
                                <Input id="name" name="name" defaultValue={target?.name} required autoComplete="off" />
                            </Field>

                            <Field label="Email" htmlFor="email" error={errors.email}>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={target?.email}
                                    required
                                    autoComplete="off"
                                />
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
                                        ? target.has_pin
                                            ? 'A PIN is set. Leave blank to keep it.'
                                            : 'No PIN set yet.'
                                        : 'Used for quick login at the POS. Optional.'
                                }
                            >
                                <Input
                                    id="pin"
                                    name="pin"
                                    inputMode="numeric"
                                    pattern="[0-9]{4,6}"
                                    minLength={4}
                                    maxLength={6}
                                    title="Enter 4 to 6 digits"
                                    autoComplete="off"
                                />
                            </Field>

                            {!target?.role_locked && (
                                <Field label="Role" htmlFor="role" error={errors.role}>
                                    <select
                                        id="role"
                                        name="role"
                                        defaultValue={target?.role ?? ''}
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

                            {!target?.is_self && (
                                <div className="flex items-center gap-2">
                                    <input
                                        id="is_active"
                                        name="is_active"
                                        type="checkbox"
                                        value="1"
                                        defaultChecked={target ? target.is_active : true}
                                        className="size-4"
                                    />
                                    <Label htmlFor="is_active">Active (can log in)</Label>
                                </div>
                            )}

                            {target && <CredentialReset userId={target.id} userName={target.name} />}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : editing ? 'Save changes' : 'Create user'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}