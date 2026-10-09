import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import UserController from '@/actions/App/Http/Controllers/UserController';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UserFormDialog from '@/pages/users/form-dialog';
import type { UserRecord } from '@/pages/users/form-dialog';
import type { BreadcrumbItem } from '@/types';

import {index, store, update} from '@/routes/users'

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    users: Paginated<UserRecord>;
    roles: string[];
    filters: { search: string };
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    user?: UserRecord;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users', href: UserController.index.url() }];

export default function Index({ users, roles, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        router.get(UserController.index.url(), { search }, { preserveState: true, replace: true });
    }

    function openCreate() {
        setDialog({ open: true, mode: 'create', user: undefined });
    }

    function openEdit(user: UserRecord) {
        setDialog({ open: true, mode: 'edit', user });
    }

    return (
        <>
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Staff accounts</h1>
                        <p className="text-muted-foreground text-sm">{users.total} total</p>
                    </div>

                    <Can permission="user.create">
                        <Button onClick={openCreate}>Add user</Button>
                    </Can>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-md gap-2">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email"
                    />
                    <Button type="submit" variant="outline">
                        Search
                    </Button>
                </form>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>PIN</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}

                            {users.data.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="capitalize">{user.role ?? 'None'}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.has_pin ? 'Set' : 'Not set'}</TableCell>
                                    <TableCell className="text-right">
                                        <Can permission="user.update">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                                                Edit
                                            </Button>
                                        </Can>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {users.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {users.current_page} of {users.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild disabled={!users.prev_page_url}>
                                <Link href={users.prev_page_url ?? '#'} preserveState>
                                    Previous
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild disabled={!users.next_page_url}>
                                <Link href={users.next_page_url ?? '#'} preserveState>
                                    Next
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <UserFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                user={dialog.user}
                roles={roles}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: index(),
        },
    ],
};
