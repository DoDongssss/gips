import { Link, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

type Paginated<T> = {
    data: T[];
    total: number;
    from: number | null;
    to: number | null;
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
    // Optional on the server: undefined until the person asks for them.
    logs?: Paginated<AuditLogRow>;
    options?: Options;
    filters: Filters;
};

// Partial reloads: only these props are requested, which is also what makes
// the optional `logs` and `options` props come back.
const ONLY = ['logs', 'options', 'filters'];

const EMPTY: Filters = { search: '', log: '', event: '', user: '', from: '', to: '' };

const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function Index({ logs, options, filters }: Props) {
    const [form, setForm] = useState<Filters>(filters);
    const [selected, setSelected] = useState<AuditLogRow | null>(null);
    const [loading, setLoading] = useState(false);

    // Memoized so TanStack Table doesn't rebuild columns on every render.
    const columns = useMemo(() => getColumns({ onDetails: setSelected }), []);

    // Sorting state comes from the server (query string), so it survives reloads and pagination.
    const sorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction !== 'asc' }] : []),
        [filters.sort, filters.direction],
    );

    const set = (key: keyof Filters, value: string) => setForm((current) => ({ ...current, [key]: value }));

    function visit(data: Filters) {
        const query = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== '' && value !== null && value !== undefined));

        router.get(index.url(), query, {
            only: ONLY,
            preserveState: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Loads with the filters currently applied on the server (not half-typed ones).
    function loadLogs() {
        visit(filters);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        visit({ ...form, sort: filters.sort, direction: filters.direction });
    }

    function reset() {
        setForm(EMPTY);
        visit({ ...EMPTY, sort: filters.sort, direction: filters.direction });
    }

    function handleSortingChange(next: SortingState) {
        const [first] = next;
        visit({ ...filters, sort: first?.id, direction: first ? (first.desc ? 'desc' : 'asc') : null });
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
                    <p className="text-muted-foreground text-sm">
                        A record of who did what, and when. Entries cannot be edited or deleted here.
                        {logs && ` ${logs.total} total.`}
                    </p>
                </div>

                <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <Input
                        className="lg:col-span-2"
                        placeholder="Search description"
                        value={form.search}
                        onChange={(event) => set('search', event.target.value)}
                    />

                    <select className={selectClass} value={form.log} onChange={(event) => set('log', event.target.value)}>
                        <option value="">All areas</option>
                        {(options?.logs ?? []).map((log) => (
                            <option key={log} value={log}>
                                {formatEventName(log)}
                            </option>
                        ))}
                    </select>

                    <select className={selectClass} value={form.event} onChange={(event) => set('event', event.target.value)}>
                        <option value="">All events</option>
                        {(options?.events ?? []).map((event) => (
                            <option key={event} value={event}>
                                {formatEventName(event)}
                            </option>
                        ))}
                    </select>

                    <select className={selectClass} value={form.user} onChange={(event) => set('user', event.target.value)}>
                        <option value="">Everyone</option>
                        {(options?.users ?? []).map((user) => (
                            <option key={user.id} value={String(user.id)}>
                                {user.name}
                            </option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={loading}>
                            Apply
                        </Button>
                        <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                            Reset
                        </Button>
                    </div>

                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        From
                        <Input type="date" value={form.from} onChange={(event) => set('from', event.target.value)} />
                    </label>
                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        To
                        <Input type="date" value={form.to} onChange={(event) => set('to', event.target.value)} />
                    </label>
                </form>

                <DataTable
                    columns={columns}
                    data={logs?.data ?? []}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    columnClassNames={columnClassNames}
                    emptyContent={
                        logs ? (
                            'No activity found.'
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

                {logs && logs.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            Showing {logs.from}–{logs.to} of {logs.total}
                        </p>
                        <div className="flex gap-2">
                            {logs.prev_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={logs.prev_page_url} only={ONLY} preserveState>
                                        Previous
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                            )}
                            {logs.next_page_url ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={logs.next_page_url} only={ONLY} preserveState>
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

            <DetailDialog log={selected} onClose={() => setSelected(null)} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Audit Logs',
            href: index(),
        },
    ],
};