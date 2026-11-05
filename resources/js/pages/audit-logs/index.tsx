import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { columnClassNames, getColumns } from '@/pages/audit-logs/columns';
import { DetailDialog, formatEventName } from '@/pages/audit-logs/detail_dialog';
import type { AuditLogRow } from '@/pages/audit-logs/detail_dialog';
import { index } from '@/routes/audit-logs';

type Filters = {
    search: string;
    log: string;
    event: string;
    user: string;
    from: string;
    to: string;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

type Paginated<T> = {
    data: T[];
    total: number;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Options = {
    logs: string[];
    events: string[];
    users: { id: number; name: string }[];
};

type Props = {
    logs?: Paginated<AuditLogRow>;
    options?: Options;
    filters: Filters;
};

const ONLY = ['logs', 'options', 'filters'];
const ALL = 'all';

export default function Index({ logs, options, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<AuditLogRow | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const columns = useMemo(() => getColumns({ onDetails: setSelected }), []);

    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    function queryParams(next: Partial<Filters> = {}, page?: number) {
        const merged = { ...filters, ...next };

        const params: Record<string, string | number | undefined> = {
            search: merged.search || undefined,
            log: merged.log || undefined,
            event: merged.event || undefined,
            user: merged.user || undefined,
            from: merged.from || undefined,
            to: merged.to || undefined,
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
        const page = options.page ?? (resetPage ? 1 : logs?.current_page ?? 1);

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

    function loadLogs() {
        visit({});
    }

    useEffect(() => {
        if (logs) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs]);

    useEffect(() => {
        if (logs) {
            return;
        }

        const preset =
            filters.search || filters.log || filters.event || filters.user || filters.from || filters.to;

        if (preset) {
            loadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        visit({ search: '', log: '', event: '', user: '', from: '', to: '' });
    }

    const filtersActive =
        Boolean(filters.search) ||
        Boolean(filters.log) ||
        Boolean(filters.event) ||
        Boolean(filters.user) ||
        Boolean(filters.from) ||
        Boolean(filters.to);

    function filterSelect(
        key: 'log' | 'event' | 'user',
        placeholder: string,
        items: { value: string; label: string }[],
    ) {
        const value = filters[key] || ALL;

        return (
            <Select value={value} onValueChange={(next) => visit({ [key]: next === ALL ? '' : next } as Partial<Filters>)}>
                <SelectTrigger className="w-44" aria-label={placeholder}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>{placeholder}</SelectItem>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    const logOptions = (options?.logs ?? []).map((log) => ({ value: log, label: formatEventName(log) }));
    const eventOptions = (options?.events ?? []).map((event) => ({ value: event, label: formatEventName(event) }));
    const userOptions = (options?.users ?? []).map((user) => ({ value: String(user.id), label: user.name }));

    return (
        <>
            <Head title="Audit log" />

            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
                    <p className="text-muted-foreground text-sm">
                        Who did what, and when. Entries cannot be edited or deleted here.
                        {logs && ` ${logs.total} total.`}
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <form onSubmit={submitSearch} className="flex min-w-[14rem] flex-1 gap-2 sm:max-w-md">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search description"
                            aria-label="Search audit log"
                        />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    {filterSelect('log', 'All areas', logOptions)}
                    {filterSelect('event', 'All events', eventOptions)}
                    {filterSelect('user', 'Everyone', userOptions)}

                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        From
                        <Input
                            type="date"
                            className="w-auto"
                            value={filters.from}
                            onChange={(event) => visit({ from: event.target.value })}
                        />
                    </label>
                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        To
                        <Input type="date" className="w-auto" value={filters.to} onChange={(event) => visit({ to: event.target.value })} />
                    </label>

                    {filtersActive && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>

                <DataTable
                    columns={columns}
                    data={logs?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        logs ? (
                            'No activity found for these filters.'
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">The audit log isn&apos;t loaded yet.</p>
                                <Button onClick={loadLogs} disabled={loading}>
                                    {loading ? 'Loading…' : 'Load audit log'}
                                </Button>
                            </div>
                        )
                    }
                />

                {logs && (
                    <Pager
                        currentPage={logs.current_page}
                        lastPage={logs.last_page}
                        prevUrl={logs.prev_page_url}
                        nextUrl={logs.next_page_url}
                        only={ONLY}
                    />
                )}
            </div>

            <DetailDialog log={selected} onClose={() => setSelected(null)} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Audit Logs', href: index() }],
};
