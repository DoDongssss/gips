import { Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import UserController from '@/actions/App/Http/Controllers/UserController';
import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { columnClassNames, getColumns } from '@/pages/users/columns';
import UserFormDialog from '@/pages/users/form-dialog';
import type { UserRecord } from '@/pages/users/form-dialog';
import type { BreadcrumbItem } from '@/types';

import { index } from '@/routes/users';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    // Optional on the server: undefined until the person asks for it.
    users?: Paginated<UserRecord>;
    roles: string[];
    filters: { search: string; sort?: string | null; direction?: 'asc' | 'desc' | null };
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    user?: UserRecord;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `users` prop come back.
const ONLY = ['users', 'filters'];

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users', href: UserController.index.url() }];

export default function Index({ users, roles, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(() => getColumns({ onEdit: (user) => setDialog({ open: true, mode: 'edit', user }) }), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(params: { search?: string; sort?: string | null; direction?: 'asc' | 'desc' | null }) {
        router.get(
            UserController.index.url(),
            {
                search: params.search || undefined,
                sort: params.sort ?? undefined,
                direction: params.direction ?? undefined,
            },
            {
                only: ONLY,
                preserveState: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadUsers() {
        visit({ search: filters.search, sort: filters.sort, direction: filters.direction });
    }

    // Once data has been loaded, keep it loaded. A save in the dialog redirects
    // back here with a full visit that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (users) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search, sort: filters.sort, direction: filters.direction });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({
            search: filters.search,
            sort: first?.id,
            direction: first ? (first.desc ? 'desc' : 'asc') : undefined,
        });
    }

    function openCreate() {
        setDialog({ open: true, mode: 'create', user: undefined });
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Staff accounts</h1>
                        {users && <p className="text-muted-foreground text-sm">{users.total} total</p>}
                    </div>

                    <Can permission="user.create">
                        <Button onClick={openCreate}>Add user</Button>
                    </Can>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-sm gap-2">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email"
                    />
                    <Button type="submit" variant="outline" disabled={loading}>
                        Search
                    </Button>
                </form>

                <DataTable
                    columns={columns}
                    data={users?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        users ? (
                            'No users found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Users aren&apos;t loaded yet.</p>
                                <Button onClick={loadUsers} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load users'}
                                </Button>
                            </div>
                        )
                    }
                />

                {users && users.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {users.current_page} of {users.last_page}
                        </p>
                        <div className="flex gap-2">
                            {users.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={users.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {users.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={users.next_page_url} only={ONLY} preserveState>
                                        Next
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Next
                                </Button>
                            )}
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
            title: 'Users',
            href: index(),
        },
    ],
};