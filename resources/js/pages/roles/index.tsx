import { Head, router, useForm } from '@inertiajs/react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { destroy, index, store, update } from '@/routes/roles';
import type { CatalogGroup, RoleRow } from '@/types/roles';

type Props = { roles: RoleRow[]; catalog: CatalogGroup[]; grantable: string[] };

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export default function RolesIndex({ roles, catalog, grantable }: Props) {
    const [selectedId, setSelectedId] = useState<number | null>(roles[0]?.id ?? null);
    const [creating, setCreating] = useState(false);
    const [focusName, setFocusName] = useState<string | null>(null);

    const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;
    const form = useForm<{ name: string; permissions: string[] }>({ name: '', permissions: [] });
    const errors = form.errors as Record<string, string>;

    // Load the chosen role into the editor, and again after every save.
    useEffect(() => {
        if (selected) {
            form.setData({ name: selected.name, permissions: selected.permissions });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id, selected?.name, selected?.permissions.join('|')]);

    // After "New role" is saved, jump to it.
    useEffect(() => {
        const created = focusName ? roles.find((r) => r.name === focusName) : null;

        if (created) {
            setSelectedId(created.id);
            setFocusName(null);
        }
    }, [roles, focusName]);

    const dirty = useMemo(
        () => selected !== null && (form.data.name !== selected.name || !sameSet(form.data.permissions, selected.permissions)),
        [form.data, selected],
    );

    if (!selected) {
        return (
            <>
                <Head title="Roles & permissions" />
                <p className="text-muted-foreground p-6 text-sm">No roles yet.</p>
            </>
        );
    }

    const readOnly = selected.is_locked;
    const has = (name: string) => form.data.permissions.includes(name);
    // Cannot switch ON something you do not hold yourself; a role's own permissions can always be switched off.
    const blocked = (name: string) => readOnly || selected.required.includes(name) || (!grantable.includes(name) && !selected.permissions.includes(name));

    function toggle(name: string) {
        if (blocked(name)) return;
        form.setData('permissions', has(name) ? form.data.permissions.filter((p) => p !== name) : [...form.data.permissions, name]);
    }

    function toggleGroup(group: CatalogGroup) {
        const free = group.permissions.map((p) => p.name).filter((n) => !blocked(n));
        const allOn = free.every(has);

        form.setData('permissions', allOn ? form.data.permissions.filter((p) => !free.includes(p)) : [...new Set([...form.data.permissions, ...free])]);
    }

    function save(event: FormEvent) {
        event.preventDefault();
        form.put(update.url(selected!.id), { preserveScroll: true });
    }

    function remove() {
        if (window.confirm(`Delete the ${selected!.name} role? This cannot be undone.`)) {
            router.delete(destroy.url(selected!.id), { preserveScroll: true, onSuccess: () => setSelectedId(null) });
        }
    }

    return (
        <>
            <Head title="Roles & permissions" />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Roles & permissions</h1>
                        <p className="text-muted-foreground text-sm">Choose what each role can do. Changes apply to everyone with that role straight away.</p>
                    </div>
                    <Button onClick={() => setCreating(true)}>
                        <Plus className="size-4" /> New role
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
                    <nav aria-label="Roles" className="space-y-2">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedId(role.id)}
                                className={`w-full rounded-lg border p-3 text-left transition ${
                                    role.id === selected.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{role.name}</span>
                                    {role.is_locked ? (
                                        <Lock className="text-muted-foreground size-4" aria-label="Locked" />
                                    ) : role.is_built_in ? (
                                        <Badge variant="secondary">Built in</Badge>
                                    ) : null}
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {role.users_count} staff · {role.permissions.length} permissions
                                </p>
                            </button>
                        ))}
                    </nav>

                    <form onSubmit={save} className="space-y-5 rounded-lg border p-4 md:p-5">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="w-full max-w-xs space-y-1">
                                <label htmlFor="role-name" className="text-sm font-medium">
                                    Role name
                                </label>
                                <Input
                                    id="role-name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    disabled={readOnly || selected.is_built_in}
                                    autoComplete="off"
                                />
                                {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                            </div>

                            <div className="flex gap-2">
                                {selected.can_delete && (
                                    <Button type="button" variant="outline" className="text-destructive" onClick={remove}>
                                        <Trash2 className="size-4" /> Delete
                                    </Button>
                                )}
                                {!readOnly && (
                                    <>
                                        <Button type="button" variant="outline" disabled={!dirty || form.processing} onClick={() => form.setData({ name: selected.name, permissions: selected.permissions })}>
                                            Undo
                                        </Button>
                                        <Button type="submit" disabled={!dirty || form.processing}>
                                            {form.processing ? 'Saving…' : 'Save changes'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {readOnly && (
                            <p className="bg-muted rounded-md p-3 text-sm">
                                <Lock className="mr-1 inline size-4" /> {selected.name} is locked. It always has every permission and cannot be changed.
                            </p>
                        )}
                        {selected.is_built_in && !readOnly && <p className="text-muted-foreground text-sm">Built-in role: you can change what it can do, but not its name, and it cannot be deleted.</p>}
                        {errors.error && <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{errors.error}</p>}
                        {errors.permissions && <p className="text-destructive text-sm">{errors.permissions}</p>}
                        {selected.users_count > 0 && !readOnly && (
                            <p className="text-muted-foreground text-sm">{selected.users_count} staff have this role. Changes reach them the next time they open a page.</p>
                        )}

                        <div className="space-y-6">
                            {catalog.map((group) => {
                                const free = group.permissions.map((p) => p.name).filter((n) => !blocked(n));
                                const allOn = free.length > 0 && free.every(has);

                                return (
                                    <fieldset key={group.key} className="space-y-2">
                                        <div className="flex items-center justify-between border-b pb-1">
                                            <legend className="text-sm font-semibold">{group.label}</legend>
                                            {free.length > 0 && (
                                                <button type="button" className="text-primary text-xs hover:underline" onClick={() => toggleGroup(group)}>
                                                    {allOn ? 'Clear all' : 'Select all'}
                                                </button>
                                            )}
                                        </div>
                                        <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2">
                                            {group.permissions.map((permission) => {
                                                const off = blocked(permission.name);
                                                const required = selected.required.includes(permission.name);

                                                return (
                                                    <li key={permission.name}>
                                                        <label className={`flex items-start gap-3 rounded-md p-2 ${off ? 'opacity-60' : 'hover:bg-muted/50 cursor-pointer'}`}>
                                                            <input
                                                                type="checkbox"
                                                                className="accent-primary mt-1 size-4"
                                                                checked={has(permission.name)}
                                                                disabled={off}
                                                                onChange={() => toggle(permission.name)}
                                                            />
                                                            <span className="min-w-0">
                                                                <span className="block text-sm font-medium">{permission.label}</span>
                                                                {permission.description && <span className="text-muted-foreground block text-xs">{permission.description}</span>}
                                                                {required && <span className="text-muted-foreground block text-xs">Always on for this role.</span>}
                                                                {!required && !readOnly && off && <span className="text-muted-foreground block text-xs">You do not have this permission, so you cannot give it.</span>}
                                                            </span>
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </fieldset>
                                );
                            })}
                        </div>
                    </form>
                </div>
            </div>

            <NewRoleDialog
                open={creating}
                onOpenChange={setCreating}
                roles={roles}
                grantable={grantable}
                onCreated={(name) => {
                    setCreating(false);
                    setFocusName(name);
                }}
            />
        </>
    );
}

function NewRoleDialog({ open, onOpenChange, roles, grantable, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; roles: RoleRow[]; grantable: string[]; onCreated: (name: string) => void }) {
    const form = useForm({ name: '', copy_from: 'none' });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => {
            const source = roles.find((r) => String(r.id) === data.copy_from);

            // Copy only what this person may hand out.
            return { name: data.name, permissions: (source?.permissions ?? []).filter((p) => grantable.includes(p)) };
        });

        form.post(store.url(), { preserveScroll: true, onSuccess: () => onCreated(form.data.name.trim().toLowerCase()) });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>New role</DialogTitle>
                        <DialogDescription>Name it, optionally start from an existing role, then choose its permissions.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1">
                        <label htmlFor="new-role-name" className="text-sm font-medium">
                            Role name
                        </label>
                        <Input id="new-role-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="shift-lead" autoComplete="off" autoFocus />
                        <p className="text-muted-foreground text-xs">Lowercase letters, numbers, dash or underscore.</p>
                        {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="copy-from" className="text-sm font-medium">
                            Start from
                        </label>
                        <Select value={form.data.copy_from} onValueChange={(v) => form.setData('copy_from', v)}>
                            <SelectTrigger id="copy-from">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nothing (no permissions yet)</SelectItem>
                                {roles.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                        Same as {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {errors.error && <p className="text-destructive text-sm">{errors.error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing || form.data.name.trim() === ''}>
                            Create role
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

RolesIndex.layout = {
    breadcrumbs: [
        { title: 'Settings', href: '/settings/roles' },
        { title: 'Roles & permissions', href: index() },
    ],
};