import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCan } from '@/hooks/shared/use-can';
import { columnClassNames, getColumns } from '@/pages/menu/groups/columns';
import { DeleteGroupDialog } from '@/pages/menu/groups/delete-group-dialog';
import GroupFormDialog from '@/pages/menu/groups/form-dialog';
import type { GroupRecord } from '@/pages/menu/groups/form-dialog';
import { index } from '@/routes/menu/groups';
import { index as productsIndex } from '@/routes/menu/products';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    status?: string | null;
    selection?: string | null;
    required?: string | null;
    unused?: boolean;
    trashed?: boolean;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Props = {
    groups?: Paginated<GroupRecord>;
    filters: Filters;
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    group?: GroupRecord;
};

const ONLY = ['groups', 'filters'];
const ALL = 'all';

export default function Index({ groups, filters }: Props) {
    const { can } = useCan();
    const canUpdate = can('menu.update');
    const canCreate = can('menu.create');
    const canDelete = can('menu.delete');

    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<GroupRecord | null>(null);
    const [unusedOnly, setUnusedOnly] = useState(Boolean(filters.unused));
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const canReorder = !filters.search && !filters.trashed && canUpdate;
    const rows = groups?.data ?? [];

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function queryParams(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        return {
            search: merged.search || undefined,
            status: merged.status || undefined,
            selection: merged.selection || undefined,
            required: merged.required || undefined,
            unused: merged.unused ? '1' : undefined,
            trashed: merged.trashed ? '1' : undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
        };
    }

    function visit(next: Partial<Filters> = {}) {
        router.get(index.url(), queryParams(next), {
            only: ONLY,
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function loadGroups() {
        visit();
    }

    /** POST redirects do not replay partial `only` headers; reload the lazy list explicitly. */
    function refreshList() {
        visit();
    }

    useEffect(() => {
        if (groups) {
            setHasLoaded(true);
            setSelectedIds(new Set());
        } else if (hasLoaded) {
            loadGroups();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups]);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setUnusedOnly(Boolean(filters.unused));
    }, [filters.search, filters.unused]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                visit({ search });
            }
        }, 400);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({ sort: first?.id ?? null, direction: first ? (first.desc ? 'desc' : 'asc') : null });
    }

    function clearFilters() {
        setSearch('');
        setUnusedOnly(false);
        visit({ search: '', status: null, selection: null, required: null, unused: false, trashed: false });
    }

    const filtersActive =
        Boolean(filters.search) ||
        Boolean(filters.status) ||
        Boolean(filters.selection) ||
        Boolean(filters.required) ||
        Boolean(filters.unused) ||
        Boolean(filters.trashed);

    const exportUrl = `/menu/modifier-groups/export?${new URLSearchParams(
        Object.entries(queryParams()).filter(([, v]) => v !== undefined && v !== null) as [string, string][],
    )}`;

    function duplicateGroup(group: GroupRecord) {
        router.post(`/menu/modifier-groups/${group.id}/duplicate`, {}, { preserveScroll: true, onSuccess: refreshList });
    }

    function moveGroup(group: GroupRecord, direction: 'up' | 'down') {
        router.post(`/menu/modifier-groups/${group.id}/move`, { direction }, { preserveScroll: true, onSuccess: refreshList });
    }

    function restoreGroup(group: GroupRecord) {
        router.post(`/menu/modifier-groups/${group.id}/restore`, {}, { preserveScroll: true, onSuccess: refreshList });
    }

    function confirmDelete() {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/menu/modifier-groups/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteTarget(null);
                refreshList();
            },
        });
    }

    function bulk(action: string) {
        const ids = [...selectedIds];

        if (ids.length === 0) {
            return;
        }

        router.post('/menu/modifier-groups/bulk', { action, ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds(new Set());
                refreshList();
            },
        });
    }

    const columns = useMemo(
        () =>
            getColumns({
                canUpdate,
                canCreate,
                canDelete,
                canReorder,
                trashed: Boolean(filters.trashed),
                onEdit: (group) => setDialog({ open: true, mode: 'edit', group }),
                onDelete: setDeleteTarget,
                onDuplicate: duplicateGroup,
                onMove: moveGroup,
                onRestore: restoreGroup,
                selectedIds,
                onToggle: (id, checked) =>
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                            next.add(id);
                        } else {
                            next.delete(id);
                        }

                        return next;
                    }),
                onToggleAll: (checked, pageRows) =>
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        pageRows.forEach((row) => (checked ? next.add(row.id) : next.delete(row.id)));

                        return next;
                    }),
                rows,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canUpdate, canCreate, canDelete, canReorder, filters.trashed, selectedIds, rows],
    );

    return (
        <>
            <Head title="Modifier groups" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">{filters.trashed ? 'Deleted modifier groups' : 'Modifier groups'}</h1>
                        {groups && <p className="text-muted-foreground text-sm">{groups.total} total</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Can permission="menu.view">
                            <Button variant="outline" asChild>
                                <a href={exportUrl} download>
                                    Export CSV
                                </a>
                            </Button>
                        </Can>
                        <Can permission="menu.create">
                            {!filters.trashed && (
                                <Button onClick={() => setDialog({ open: true, mode: 'create', group: undefined })}>Add group</Button>
                            )}
                        </Can>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups or options" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <Select value={filters.status ?? ALL} onValueChange={(value) => visit({ status: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            <SelectItem value="active">Visible</SelectItem>
                            <SelectItem value="inactive">Hidden</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.selection ?? ALL} onValueChange={(value) => visit({ selection: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Rule" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Any rule</SelectItem>
                            <SelectItem value="single">Pick one</SelectItem>
                            <SelectItem value="multiple">Pick several</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.required ?? ALL} onValueChange={(value) => visit({ required: value === ALL ? null : value })}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Required" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Any</SelectItem>
                            <SelectItem value="1">Required</SelectItem>
                            <SelectItem value="0">Optional</SelectItem>
                        </SelectContent>
                    </Select>

                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={unusedOnly}
                            onCheckedChange={(checked) => {
                                setUnusedOnly(checked === true);
                                visit({ unused: checked === true });
                            }}
                        />
                        Unused only
                    </label>

                    {canDelete && (
                        <Button variant={filters.trashed ? 'default' : 'outline'} onClick={() => visit({ trashed: !filters.trashed })}>
                            {filters.trashed ? 'Back to active' : 'Deleted'}
                        </Button>
                    )}

                    {filtersActive && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>

                {canReorder && <p className="text-muted-foreground text-xs">Use the arrows to change list order. Attach groups to products from each product&apos;s Add-ons tab.</p>}

                {selectedIds.size > 0 && canUpdate && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('show')}>
                            Show on menu
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('hide')}>
                            Hide
                        </Button>
                        {canDelete && (
                            <Button type="button" size="sm" variant="destructive" onClick={() => bulk('delete')}>
                                Delete
                            </Button>
                        )}
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={rows}
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

                {groups && (
                    <Pager currentPage={groups.current_page} lastPage={groups.last_page} prevUrl={groups.prev_page_url} nextUrl={groups.next_page_url} only={ONLY} />
                )}
            </div>

            <GroupFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                group={dialog.group}
            />

            <DeleteGroupDialog
                open={deleteTarget !== null}
                name={deleteTarget?.name ?? null}
                productsCount={deleteTarget?.products_count ?? 0}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Menu', href: productsIndex() },
        { title: 'Modifiers', href: index() },
    ],
};
