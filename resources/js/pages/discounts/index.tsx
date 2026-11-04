import { Head, router, usePage } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/can';
import { DataTable } from '@/components/data-table';
import { Pager } from '@/components/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { columnClassNames, getColumns } from '@/pages/discounts/columns';
import DiscountFormDialog from '@/pages/discounts/form-dialog';
import type { DiscountRecord } from '@/pages/discounts/form-dialog';
import { index } from '@/routes/discounts';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filters = {
    search: string;
    status: string;
    type: string;
    applies_to: string;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

type Props = {
    discounts?: Paginated<DiscountRecord>;
    filters: Filters;
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    discount?: DiscountRecord;
};

const ONLY = ['discounts', 'filters'];
const ALL = 'all';

export default function Index({ discounts, filters }: Props) {
    const flash = usePage().props.flash as { success?: string } | undefined;

    const [search, setSearch] = useState(filters.search ?? '');
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const columns = useMemo(() => getColumns({ onEdit: (discount) => setDialog({ open: true, mode: 'edit', discount }) }), []);

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function queryParams(next: Partial<Filters> = {}, page?: number) {
        const merged = { ...filters, ...next };

        const params: Record<string, string | number | undefined> = {
            search: merged.search || undefined,
            status: merged.status || undefined,
            type: merged.type || undefined,
            applies_to: merged.applies_to || undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
        };

        if (page !== undefined) {
            params.page = page > 1 ? page : undefined;
        }

        return params;
    }

    function visit(next: Partial<Filters> = {}, options: { resetPage?: boolean; page?: number } = {}) {
        const resetPage = options.resetPage ?? Object.keys(next).length > 0;
        const page = options.page ?? (resetPage ? 1 : discounts?.current_page ?? 1);

        router.get(
            index.url({ query: queryParams(next, page) }),
            {},
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

    function loadDiscounts() {
        visit({});
    }

    function refreshList() {
        visit({}, { resetPage: false, page: discounts?.current_page ?? 1 });
    }

    useEffect(() => {
        if (discounts) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadDiscounts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [discounts]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash?.success]);

    useEffect(() => {
        setSearch(filters.search ?? '');
    }, [filters.search]);

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
        visit({ search: '', status: '', type: '', applies_to: '' });
    }

    const filtersActive =
        Boolean(filters.search) || Boolean(filters.status) || Boolean(filters.type) || Boolean(filters.applies_to);

    function filterSelect(key: 'status' | 'type' | 'applies_to', placeholder: string, options: { value: string; label: string }[]) {
        const value = filters[key] || ALL;

        return (
            <Select
                value={value}
                onValueChange={(next) => visit({ [key]: next === ALL ? '' : next } as Partial<Filters>)}
            >
                <SelectTrigger className="w-40" aria-label={placeholder}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>{placeholder}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <>
            <Head title="Discounts" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Discounts</h1>
                        {discounts && <p className="text-muted-foreground text-sm">{discounts.total} total</p>}
                    </div>

                    <Can permission="discount.manage">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', discount: undefined })}>Add discount</Button>
                    </Can>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={submitSearch} className="flex max-w-sm flex-1 gap-2">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name or code"
                            aria-label="Search discounts"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {filterSelect('status', 'All statuses', [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Off' },
                    ])}
                    {filterSelect('type', 'All types', [
                        { value: 'percent', label: 'Percent' },
                        { value: 'fixed', label: 'Fixed amount' },
                    ])}
                    {filterSelect('applies_to', 'All scopes', [
                        { value: 'order', label: 'Whole order' },
                        { value: 'item', label: 'One item' },
                    ])}

                    {filtersActive && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>

                <DataTable
                    columns={columns}
                    data={discounts?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        discounts ? (
                            'No discounts found for these filters.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Discounts aren&apos;t loaded yet.</p>
                                <Button onClick={loadDiscounts} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load discounts'}
                                </Button>
                            </div>
                        )
                    }
                />

                {discounts && (
                    <Pager
                        currentPage={discounts.current_page}
                        lastPage={discounts.last_page}
                        prevUrl={discounts.prev_page_url}
                        nextUrl={discounts.next_page_url}
                        only={ONLY}
                    />
                )}
            </div>

            <DiscountFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                discount={dialog.discount}
                onSaved={refreshList}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Discounts', href: index() }],
};
