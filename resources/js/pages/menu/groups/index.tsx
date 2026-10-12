import { Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { columnClassNames, getColumns } from '@/pages/menu/groups/columns';
import GroupFormDialog from '@/pages/menu/groups/form-dialog';
import type { GroupRecord } from '@/pages/menu/groups/form-dialog';
import { destroy, index } from '@/routes/menu/groups';

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
    groups?: Paginated<GroupRecord>;
    filters: { search: string; sort?: string | null; direction?: 'asc' | 'desc' | null };
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    group?: GroupRecord;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `groups` prop come back.
const ONLY = ['groups', 'filters'];

export default function Index({ groups, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    function remove(group: GroupRecord) {
        const note =
            group.products_count > 0 ? ` It is used by ${group.products_count} product(s) and will be removed from them.` : '';

        if (confirm(`Delete "${group.name}"?${note}`)) {
            router.delete(destroy.url(group.id), { preserveScroll: true });
        }
    }

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(
        () =>
            getColumns({
                onEdit: (group) => setDialog({ open: true, mode: 'edit', group }),
                onDelete: remove,
            }),
        [],
    );

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function visit(params: { search?: string; sort?: string | null; direction?: 'asc' | 'desc' | null }) {
        router.get(
            index.url(),
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

    function loadGroups() {
        visit({ search: filters.search, sort: filters.sort, direction: filters.direction });
    }

    // Once data has been loaded, keep it loaded. A save, delete or availability
    // toggle redirects back with a full visit that drops the optional prop, so fetch it again.
    useEffect(() => {
        if (groups) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadGroups();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups]);

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

    return (
        <>
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Modifier groups</h1>
                        {groups && <p className="text-muted-foreground text-sm">{groups.total} total</p>}
                    </div>

                    <Can permission="menu.create">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', group: undefined })}>Add group</Button>
                    </Can>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-sm gap-2">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups" />
                    <Button type="submit" variant="outline" disabled={loading}>
                        Search
                    </Button>
                </form>

                <DataTable
                    columns={columns}
                    data={groups?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        groups ? (
                            'No modifier groups found.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Modifier groups aren&apos;t loaded yet.</p>
                                <Button onClick={loadGroups} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load groups'}
                                </Button>
                            </div>
                        )
                    }
                />

                {groups && groups.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Page {groups.current_page} of {groups.last_page}
                        </p>
                        <div className="flex gap-2">
                            {groups.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={groups.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {groups.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={groups.next_page_url} only={ONLY} preserveState>
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

            <GroupFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                group={dialog.group}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Menu', href: '/menu/products' },
        { title: 'Modifiers', href: index() },
    ],
};