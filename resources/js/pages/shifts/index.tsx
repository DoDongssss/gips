import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/shared/can';
import { Pager } from '@/components/shared/pager';
import { ReopenDialog } from '@/components/shared/reopen-dialog';
import { printShift, ShiftPaper } from '@/components/reports/shift-paper';
import { XReportButton } from '@/components/reports/x-report-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShiftRealtime } from '@/hooks/pusher/use-shift-realtime';
import { formatPeso } from '@/lib/money';
import { CloseShiftDialog } from '@/pages/shifts/close-dialog';
import { MovementDialog } from '@/pages/shifts/movement-dialog';
import OpenShiftDialog from '@/pages/shifts/open-shift-dialog';
import { ShiftCashRows } from '@/pages/shifts/shift-cash-rows';
import type { ShiftFilters, ShiftRecord } from '@/types/shifts';
import { exportMethod, index, show } from '@/routes/shifts';
import { index as posIndex } from '@/routes/pos';

type Paginated = {
    data: ShiftRecord[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    current: ShiftRecord | null;
    open_shifts: ShiftRecord[];
    require_shift: boolean;
    can_view_all: boolean;
    cashiers: { id: number; name: string }[];
    history?: Paginated;
    filters: ShiftFilters;
};

const ONLY = ['history', 'filters'];
const ALL = 'all';

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');
const time = (value: string | null) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

function VarianceBadge({ cents }: { cents: number | null }) {
    if (cents === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (cents === 0) {
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Balanced</Badge>;
    }

    return cents > 0 ? (
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Over {formatPeso(cents)}</Badge>
    ) : (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Short {formatPeso(Math.abs(cents))}</Badge>
    );
}

function OpenShiftPanel({
    shift,
    onMove,
    onClose,
    title,
}: {
    shift: ShiftRecord;
    onMove: () => void;
    onClose: () => void;
    title: string;
}) {
    return (
        <section className="space-y-4 rounded-lg border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{title}</h2>
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Open</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {shift.cashier} · since {dateTime(shift.opened_at)}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={show.url(shift.id)}>Details</Link>
                    </Button>
                    <Can permission="shift.open">
                        <XReportButton scope="shift" shiftId={shift.id} label="X report" variant="outline" />
                        <Button variant="outline" onClick={onMove}>
                            Cash in / out
                        </Button>
                    </Can>
                    <Can permission="shift.close">
                        <Button onClick={onClose}>Count &amp; close</Button>
                    </Can>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                    <ShiftCashRows shift={shift} />
                </div>
                <MovementList shift={shift} />
            </div>
        </section>
    );
}

function MovementList({ shift }: { shift: ShiftRecord }) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold">Cash movements</h3>
            {shift.movements.length === 0 ? (
                <p className="text-muted-foreground text-sm">None yet.</p>
            ) : (
                <ul className="divide-y text-sm">
                    {shift.movements.map((m) => (
                        <li key={m.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
                            <div>
                                <p className="font-medium">{m.label}</p>
                                <p className="text-muted-foreground text-xs">
                                    {time(m.at)} · {m.by}
                                    {m.reason && ` · ${m.reason}`}
                                </p>
                            </div>
                            <span className="font-medium">{formatPeso(m.amount_cents)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ShiftsIndex({
    current,
    open_shifts,
    require_shift,
    can_view_all,
    cashiers,
    history,
    filters,
}: Props) {
    const flash = usePage().props.flash as { success?: string; error?: string } | undefined;

    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [opening, setOpening] = useState(false);
    const [moving, setMoving] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closingShift, setClosingShift] = useState<ShiftRecord | null>(null);
    const [reopening, setReopening] = useState<ShiftRecord | null>(null);
    const [viewing, setViewing] = useState<ShiftRecord | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useShiftRealtime(Boolean(current) || open_shifts.length > 0);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    function queryParams(next: Partial<ShiftFilters> = {}, page?: number) {
        const merged = { ...filters, ...next };
        const params: Record<string, string | number | undefined> = {
            search: merged.search || undefined,
            from: merged.from || undefined,
            to: merged.to || undefined,
            user: merged.user || undefined,
            variance: merged.variance || undefined,
            sort: merged.sort ?? undefined,
            direction: merged.direction ?? undefined,
        };
        if (page !== undefined) {
            params.page = page > 1 ? page : undefined;
        }

        return params;
    }

    function visitHistory(next: Partial<ShiftFilters> = {}, options: { resetPage?: boolean; page?: number } = {}) {
        const resetPage = options.resetPage ?? Object.keys(next).length > 0;
        const page = options.page ?? (resetPage ? 1 : history?.current_page ?? 1);

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

    function loadHistory() {
        visitHistory({});
    }

    useEffect(() => {
        if (history) {
            setHasLoaded(true);
        } else if (hasLoaded) {
            loadHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history]);

    useEffect(() => {
        setSearch(filters.search ?? '');
    }, [filters.search]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                visitHistory({ search });
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
        visitHistory({ search });
    }

    function clearFilters() {
        setSearch('');
        visitHistory({ search: '', from: '', to: '', user: '', variance: '' });
    }

    const filtersActive = Boolean(filters.search || filters.from || filters.to || filters.user || filters.variance);

    const closeTarget = closingShift ?? current;

    return (
        <>
            <Head title="Shift" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Shift</h1>
                        <p className="text-muted-foreground text-sm">Your cash drawer: open it, record cash in and out, then count and close.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Can permission="report.view">
                            <XReportButton scope="day" label="Day X report" variant="outline" />
                        </Can>
                        {can_view_all && (
                            <Button variant="outline" asChild>
                                <a href={exportMethod.url({ query: queryParams() })}>Export CSV</a>
                            </Button>
                        )}
                    </div>
                </div>

                {current && (
                    <OpenShiftPanel
                        shift={current}
                        title="Your shift"
                        onMove={() => setMoving(true)}
                        onClose={() => {
                            setClosingShift(null);
                            setClosing(true);
                        }}
                    />
                )}

                {can_view_all && open_shifts.filter((s) => s.id !== current?.id).length > 0 && (
                    <section className="space-y-3">
                        <h2 className="font-semibold">All open drawers</h2>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Cashier</th>
                                        <th className="px-3 py-2 font-medium">Since</th>
                                        <th className="px-3 py-2 text-right font-medium">Expected</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {open_shifts
                                        .filter((s) => s.id !== current?.id)
                                        .map((s) => (
                                            <tr key={s.id}>
                                                <td className="px-3 py-2">{s.cashier}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{time(s.opened_at)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {s.expected_cash_cents === null ? '—' : formatPeso(s.expected_cash_cents)}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={show.url(s.id)}>View</Link>
                                                    </Button>
                                                    <Can permission="shift.close">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="ml-1"
                                                            onClick={() => {
                                                                setClosingShift(s);
                                                                setClosing(true);
                                                            }}
                                                        >
                                                            Close
                                                        </Button>
                                                    </Can>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {!current && (
                    <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-6">
                        <div>
                            <h2 className="font-semibold">No open shift</h2>
                            <p className="text-muted-foreground text-sm">
                                {require_shift ? 'You need an open shift before taking orders.' : 'Open a shift to track the cash in your drawer.'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {require_shift && (
                                <Button variant="outline" asChild>
                                    <Link href={posIndex.url()}>Register</Link>
                                </Button>
                            )}
                            <Can permission="shift.open">
                                <Button onClick={() => setOpening(true)}>Open shift</Button>
                            </Can>
                        </div>
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="font-semibold">{can_view_all ? 'Closed shifts' : 'Your closed shifts'}</h2>

                    <div className="flex flex-wrap items-end gap-2">
                        <form onSubmit={submitSearch} className="flex min-w-[12rem] flex-1 gap-2 sm:max-w-xs">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search cashier or notes"
                                aria-label="Search shifts"
                            />
                            <Button type="submit" variant="outline" disabled={loading}>
                                Search
                            </Button>
                        </form>

                        <Input type="date" className="w-auto" value={filters.from} onChange={(e) => visitHistory({ from: e.target.value })} aria-label="From date" />
                        <Input type="date" className="w-auto" value={filters.to} onChange={(e) => visitHistory({ to: e.target.value })} aria-label="To date" />

                        {can_view_all && (
                            <Select value={filters.user || ALL} onValueChange={(v) => visitHistory({ user: v === ALL ? '' : v })}>
                                <SelectTrigger className="w-44" aria-label="Cashier">
                                    <SelectValue placeholder="All cashiers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All cashiers</SelectItem>
                                    {cashiers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={filters.variance || ALL} onValueChange={(v) => visitHistory({ variance: v === ALL ? '' : v })}>
                            <SelectTrigger className="w-36" aria-label="Result">
                                <SelectValue placeholder="All results" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All results</SelectItem>
                                <SelectItem value="balanced">Balanced</SelectItem>
                                <SelectItem value="short">Short</SelectItem>
                                <SelectItem value="over">Over</SelectItem>
                            </SelectContent>
                        </Select>

                        {filtersActive && (
                            <Button type="button" variant="ghost" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                    </div>

                    {!history ? (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <p className="text-muted-foreground text-sm">Closed shift history isn&apos;t loaded yet.</p>
                            <Button onClick={loadHistory} disabled={loading}>
                                {loading ? 'Loading…' : 'Load history'}
                            </Button>
                        </div>
                    ) : history.data.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No closed shifts match these filters.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="text-muted-foreground bg-muted/40 text-left">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Date</th>
                                            {can_view_all && <th className="px-3 py-2 font-medium">Cashier</th>}
                                            <th className="px-3 py-2 font-medium">Opened – closed</th>
                                            <th className="px-3 py-2 text-right font-medium">Expected</th>
                                            <th className="px-3 py-2 text-right font-medium">Counted</th>
                                            <th className="px-3 py-2 font-medium">Result</th>
                                            <th className="px-3 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {history.data.map((s) => (
                                            <tr key={s.id}>
                                                <td className="px-3 py-2">{s.business_date}</td>
                                                {can_view_all && <td className="px-3 py-2">{s.cashier}</td>}
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {time(s.opened_at)} – {time(s.closed_at)}
                                                </td>
                                                <td className="px-3 py-2 text-right">{s.expected_cash_cents === null ? '—' : formatPeso(s.expected_cash_cents)}</td>
                                                <td className="px-3 py-2 text-right">{s.counted_cash_cents === null ? '—' : formatPeso(s.counted_cash_cents)}</td>
                                                <td className="px-3 py-2">
                                                    <VarianceBadge cents={s.variance_cents} />
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={show.url(s.id)}>View</Link>
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setViewing(s)}>
                                                        Print
                                                    </Button>
                                                    <Can permission="shift.reopen">
                                                        <Button size="sm" variant="outline" className="ml-1" onClick={() => setReopening(s)}>
                                                            Reopen
                                                        </Button>
                                                    </Can>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pager
                                currentPage={history.current_page}
                                lastPage={history.last_page}
                                prevUrl={history.prev_page_url}
                                nextUrl={history.next_page_url}
                                only={ONLY}
                            />
                        </>
                    )}
                </section>
            </div>

            <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Shift report</DialogTitle>
                    </DialogHeader>
                    {viewing && <ShiftPaper shift={viewing} />}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewing(null)}>
                            Close
                        </Button>
                        <Button onClick={() => viewing && printShift(viewing)}>Print</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReopenDialog
                open={reopening !== null}
                onOpenChange={(open) => !open && setReopening(null)}
                title={`Reopen ${reopening?.cashier ?? 'this'}'s shift?`}
                description="The shift goes back to open and the count is cleared. The cashier counts the drawer again when closing it. It only works while the day is reopened on the Z reports page."
                url={reopening ? `/shifts/${reopening.id}/reopen` : ''}
                confirmLabel="Reopen shift"
            />

            <OpenShiftDialog open={opening} onOpenChange={setOpening} />

            {current && <MovementDialog shiftId={current.id} open={moving} onOpenChange={setMoving} />}

            {closeTarget && (
                <CloseShiftDialog
                    shiftId={closeTarget.id}
                    open={closing}
                    onOpenChange={(open) => {
                        setClosing(open);
                        if (!open) {
                            setClosingShift(null);
                        }
                    }}
                    closePreviewCents={closeTarget.close_preview_cents}
                />
            )}
        </>
    );
}

ShiftsIndex.layout = {
    breadcrumbs: [{ title: 'Shift', href: index() }],
};
