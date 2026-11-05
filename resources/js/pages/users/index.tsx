import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery } from '@/lib/inventory';
import { columnClassNames, getColumns } from '@/pages/users/columns';
import UserFormDialog from '@/pages/users/form-dialog';
import type { UserRecord } from '@/pages/users/form-dialog';
import type { Paginated } from '@/types/menu';

import { index } from '@/routes/users';

type Filters = {
    search: string;
    role: string | null;
    status: string | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    users?: Paginated<UserRecord>;
    roles: string[];
    filters: Filters;
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    user?: UserRecord;
};

const ONLY = ['users', 'filters'];
const ALL = 'all';

export default function Index({ users, roles, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState<Paginated<UserRecord> | undefined>(users);
    const data = users ?? loaded;

    const columns = useMemo(() => getColumns({ onEdit: (user) => setDialog({ open: true, mode: 'edit', user }) }), []);

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        router.get(
            index.url(),
            cleanQuery({
                search: merged.search,
                role: merged.role,
                status: merged.status,
                sort: merged.sort,
                direction: merged.direction,
            }),
            {
                only: ONLY,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadUsers() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (users) {
            setLoaded(users);
        } else if (loaded) {
            loadUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    function openCreate() {
        setDialog({ open: true, mode: 'create', user: undefined });
    }

    const roleLabel = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

    return (
        <>
            <Head title="Users" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
                        {data && <p className="text-muted-foreground text-sm">{data.total} total</p>}
                    </div>

                    <Can permission="user.create">
                        <Button onClick={openCreate}>Add user</Button>
                    </Can>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name or email"
                            aria-label="Search users"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.role ?? ALL} onValueChange={(value) => visit({ role: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40" aria-label="Role">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All roles</SelectItem>
                            {roles.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {roleLabel(role)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.status ?? ALL} onValueChange={(value) => visit({ status: value === ALL ? null : value })}>
                        <SelectTrigger className="w-36" aria-label="Status">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DataTable
                    columns={columns}
                    data={data?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        data ? (
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

                {data && (
                    <Pager
                        currentPage={data.current_page}
                        lastPage={data.last_page}
                        prevUrl={data.prev_page_url}
                        nextUrl={data.next_page_url}
                        only={ONLY}
                    />
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
    breadcrumbs: [{ title: 'Users', href: index() }],
};
