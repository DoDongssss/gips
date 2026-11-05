import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPeso } from '@/lib/money';
import {
    marginColumnClassNames,
    marginColumns,
    stockColumnClassNames,
    stockColumns,
    usageColumnClassNames,
    usageColumns,
    type MarginRow,
    type StockRow,
    type UsageRow,
} from '@/pages/inventory/reports/columns';
import { index } from '@/routes/inventory/reports';

type Summary = {
    cogs_cents: number;
    waste_cents: number;
    net_sales_cents: number;
    gross_profit_cents: number;
    food_cost_pct: number | null;
};

type Props = {
    range: { from: string; to: string };
    summary?: Summary;
    usage?: UsageRow[];
    margins?: MarginRow[];
    stock?: StockRow[];
};

const ONLY_BASE = ['range', 'summary'] as const;

function formatDay(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function addDays(iso: string, days: number): string {
    const date = new Date(iso + 'T12:00:00');
    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
}

function sortLocal<T>(rows: T[], sorting: SortingState, valueOf: (row: T, columnId: string) => string | number): T[] {
    if (sorting.length === 0) {
        return rows;
    }

    const { id, desc } = sorting[0];

    return [...rows].sort((a, b) => {
        const av = valueOf(a, id);
        const bv = valueOf(b, id);

        if (typeof av === 'number' && typeof bv === 'number') {
            return desc ? bv - av : av - bv;
        }

        return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
}

function usageValue(row: UsageRow, id: string): string | number {
    if (id === 'ingredient') {
        return row.ingredient;
    }

    return row[id as keyof UsageRow] as number;
}

function marginValue(row: MarginRow, id: string): string | number {
    if (id === 'product') {
        return `${row.product} ${row.variant ?? ''}`;
    }

    if (id === 'food_cost_pct') {
        return row.food_cost_pct ?? -1;
    }

    return (row[id as keyof MarginRow] as number | null) ?? -1;
}

function stockValue(row: StockRow, id: string): string | number {
    if (id === 'quantity' || id === 'reorder_level') {
        return Number(row[id]);
    }

    return id === 'name' ? row.name : row.value_cents;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </div>
    );
}

const Loading = () => <p className="text-muted-foreground py-10 text-center text-sm">Loading…</p>;

export default function InventoryReports({ range, summary, usage, margins, stock }: Props) {
    const [from, setFrom] = useState(range.from);
    const [to, setTo] = useState(range.to);
    const [tab, setTab] = useState('usage');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [hideIncomplete, setHideIncomplete] = useState(false);

    const [loadedSummary, setLoadedSummary] = useState<Summary | undefined>(summary);
    const summaryData = summary ?? loadedSummary;

    const [loadedUsage, setLoadedUsage] = useState<UsageRow[] | undefined>(usage);
    const [loadedMargins, setLoadedMargins] = useState<MarginRow[] | undefined>(margins);
    const [loadedStock, setLoadedStock] = useState<StockRow[] | undefined>(stock);

    const usageData = usage ?? loadedUsage;
    const marginsData = margins ?? loadedMargins;
    const stockData = stock ?? loadedStock;

    const [usageSorting, setUsageSorting] = useState<SortingState>([{ id: 'used_cost_cents', desc: true }]);
    const [marginSorting, setMarginSorting] = useState<SortingState>([{ id: 'food_cost_pct', desc: true }]);
    const [stockSorting, setStockSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

    const stale =
        summaryData !== undefined && (range.from !== from || range.to !== to);

    const rangeLabel =
        range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`;

    const tabProp = tab === 'usage' ? 'usage' : tab === 'margins' ? 'margins' : 'stock';

    function reloadOnly(only: string[]) {
        router.reload({
            only,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function loadReport(event?: FormEvent) {
        event?.preventDefault();

        router.get(
            index.url(),
            { from, to },
            {
                only: [...ONLY_BASE, tabProp],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function applyPreset(preset: 'today' | 'yesterday' | 'last7') {
        const end = range.to;

        if (preset === 'today') {
            setFrom(end);
            setTo(end);
        } else if (preset === 'yesterday') {
            const day = addDays(end, -1);
            setFrom(day);
            setTo(day);
        } else {
            setFrom(addDays(end, -6));
            setTo(end);
        }
    }

    function openTab(next: string) {
        setTab(next);
        const name = next === 'usage' ? 'usage' : next === 'margins' ? 'margins' : 'stock';
        const current = next === 'usage' ? usageData : next === 'margins' ? marginsData : stockData;

        if (summaryData !== undefined && current === undefined) {
            reloadOnly([name]);
        }
    }

    useEffect(() => {
        if (summary) {
            setLoadedSummary(summary);
        } else if (loadedSummary) {
            reloadOnly([...ONLY_BASE]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary]);

    useEffect(() => {
        if (usage) {
            setLoadedUsage(usage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usage]);

    useEffect(() => {
        if (margins) {
            setLoadedMargins(margins);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [margins]);

    useEffect(() => {
        if (stock) {
            setLoadedStock(stock);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stock]);

    const usageColumnsMemo = useMemo(() => usageColumns(), []);
    const marginColumnsMemo = useMemo(() => marginColumns(), []);
    const stockColumnsMemo = useMemo(() => stockColumns(), []);

    const filteredUsage = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = usageData ?? [];

        if (!q) {
            return rows;
        }

        return rows.filter((row) => row.ingredient.toLowerCase().includes(q));
    }, [usageData, search]);

    const sortedUsage = useMemo(() => sortLocal(filteredUsage, usageSorting, usageValue), [filteredUsage, usageSorting]);

    const usageTotals = useMemo(() => {
        return filteredUsage.reduce(
            (acc, row) => ({
                used_cost_cents: acc.used_cost_cents + row.used_cost_cents,
                waste_cost_cents: acc.waste_cost_cents + row.waste_cost_cents,
                variance_cost_cents: acc.variance_cost_cents + row.variance_cost_cents,
            }),
            { used_cost_cents: 0, waste_cost_cents: 0, variance_cost_cents: 0 },
        );
    }, [filteredUsage]);

    const filteredMargins = useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = marginsData ?? [];

        if (hideIncomplete) {
            rows = rows.filter((row) => !row.needs_conversion);
        }

        if (!q) {
            return rows;
        }

        return rows.filter((row) => `${row.product} ${row.variant ?? ''}`.toLowerCase().includes(q));
    }, [marginsData, search, hideIncomplete]);

    const sortedMargins = useMemo(() => sortLocal(filteredMargins, marginSorting, marginValue), [filteredMargins, marginSorting]);

    const filteredStock = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = stockData ?? [];

        if (!q) {
            return rows;
        }

        return rows.filter((row) => row.name.toLowerCase().includes(q));
    }, [stockData, search]);

    const sortedStock = useMemo(() => sortLocal(filteredStock, stockSorting, stockValue), [filteredStock, stockSorting]);

    const stockValueTotal = (stockData ?? []).reduce((sum, row) => sum + row.value_cents, 0);

    const exportBase = `/inventory/reports/export?${new URLSearchParams({ from: range.from, to: range.to })}`;
    const exportUrl =
        tab === 'stock'
            ? `${exportBase}&section=stock`
            : tab === 'margins'
              ? `${exportBase}&section=margins`
              : `${exportBase}&section=usage`;

    return (
        <>
            <Head title="Inventory costs" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Inventory costs</h1>
                        <p className="text-muted-foreground text-sm">Food cost, margins, usage and where stock went missing.</p>
                    </div>

                    <Can permission="report.export">
                        {summaryData && !stale ? (
                            <Button variant="outline" asChild>
                                <a href={exportUrl} download>
                                    Export CSV
                                </a>
                            </Button>
                        ) : (
                            <Button variant="outline" disabled title="Load the report first">
                                Export CSV
                            </Button>
                        )}
                    </Can>
                </div>

                <form onSubmit={loadReport} className="space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="cost-from">From</Label>
                            <Input id="cost-from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cost-to">To</Label>
                            <Input id="cost-to" type="date" className="w-40" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Loading…' : 'Load report'}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('today')}>
                            Today
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('yesterday')}>
                            Yesterday
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => applyPreset('last7')}>
                            Last 7 days
                        </Button>
                    </div>
                </form>

                {!summaryData ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-sm">
                        <p>Pick a date range, then load the report. Tab details load when you open each tab.</p>
                        <p className="max-w-lg text-center text-xs">
                            Sales usage and food cost follow each order&apos;s business date. Other movements use the time they were recorded.
                        </p>
                        <Button onClick={() => loadReport()} disabled={loading}>
                            {loading ? 'Loading…' : 'Load report'}
                        </Button>
                    </div>
                ) : (
                    <>
                        {stale && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                Dates changed — load again to refresh the numbers shown for {rangeLabel}.
                            </p>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <Stat
                                label="Food cost"
                                value={summaryData.food_cost_pct === null ? '—' : `${summaryData.food_cost_pct}%`}
                                hint="Cost of ingredients sold ÷ net sales"
                            />
                            <Stat label="Cost of ingredients sold" value={formatPeso(summaryData.cogs_cents)} hint="Recipes deducted at snapshot cost" />
                            <Stat label="Waste cost" value={formatPeso(summaryData.waste_cents)} hint="Logged waste in this period" />
                            <Stat label="Gross profit" value={formatPeso(summaryData.gross_profit_cents)} hint="Net sales minus ingredient cost" />
                            <Stat label="Net sales" value={formatPeso(summaryData.net_sales_cents)} hint="Matches sales reports (paid, net of refunds)" />
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Period on screen: {rangeLabel}. Sales usage and COGS use order business dates; purchases, waste, counts and adjustments use movement time.
                        </p>

                        <Tabs value={tab} onValueChange={openTab}>
                            <TabsList>
                                <TabsTrigger value="usage">Usage &amp; variance</TabsTrigger>
                                <TabsTrigger value="margins">Margins by product</TabsTrigger>
                                <TabsTrigger value="stock">Stock on hand</TabsTrigger>
                            </TabsList>

                            <TabsContent value="usage" className="space-y-3 pt-3">
                                {usageData === undefined ? (
                                    <Loading />
                                ) : (
                                    <>
                                        <p className="text-muted-foreground text-sm">
                                            <strong>Variance</strong> is stock that appeared or vanished beyond recipes and logged waste, from counts and manual adjustments.
                                        </p>
                                        <Input
                                            placeholder="Search ingredients…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="max-w-xs"
                                        />
                                        <DataTable
                                            columns={usageColumnsMemo}
                                            data={sortedUsage}
                                            sorting={usageSorting}
                                            onSortingChange={setUsageSorting}
                                            columnClassNames={usageColumnClassNames}
                                            emptyContent="No stock movements in this period."
                                        />
                                        {filteredUsage.length > 0 && (
                                            <div className="bg-muted/40 flex flex-wrap justify-end gap-6 rounded-lg border px-4 py-3 text-sm font-medium">
                                                <span>
                                                    Total cost of use: <span className="tabular-nums">{formatPeso(usageTotals.used_cost_cents)}</span>
                                                </span>
                                                <span>
                                                    Total waste: <span className="tabular-nums">{formatPeso(usageTotals.waste_cost_cents)}</span>
                                                </span>
                                                <span>
                                                    Total variance: <span className="tabular-nums">{formatPeso(usageTotals.variance_cost_cents)}</span>
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="margins" className="space-y-3 pt-3">
                                {marginsData === undefined ? (
                                    <Loading />
                                ) : (
                                    <>
                                        <p className="text-muted-foreground text-sm">Recipe cost at today&apos;s average ingredient costs against the selling price.</p>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <Input
                                                placeholder="Search products…"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="max-w-xs"
                                            />
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox checked={hideIncomplete} onCheckedChange={(v) => setHideIncomplete(v === true)} />
                                                Hide items needing unit conversion
                                            </label>
                                        </div>
                                        <DataTable
                                            columns={marginColumnsMemo}
                                            data={sortedMargins}
                                            sorting={marginSorting}
                                            onSortingChange={setMarginSorting}
                                            columnClassNames={marginColumnClassNames}
                                            emptyContent="No recipes yet. Add them from each product's Recipe tab."
                                        />
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="stock" className="space-y-3 pt-3">
                                {stockData === undefined ? (
                                    <Loading />
                                ) : stockData.length === 0 ? (
                                    <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                                        No active ingredients on file. Add ingredients under Inventory to track stock on hand.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-muted-foreground text-sm">
                                            Value of stock on hand at average cost: {formatPeso(stockValueTotal)}. Negative quantities count as zero in value.
                                        </p>
                                        <Input
                                            placeholder="Search ingredients…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="max-w-xs"
                                        />
                                        <DataTable
                                            columns={stockColumnsMemo}
                                            data={sortedStock}
                                            sorting={stockSorting}
                                            onSortingChange={setStockSorting}
                                            columnClassNames={stockColumnClassNames}
                                            emptyContent="No ingredients match your search."
                                        />
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </>
    );
}

InventoryReports.layout = {
    breadcrumbs: [
        { title: 'Reports', href: index() },
        { title: 'Inventory costs', href: index() },
    ],
};
