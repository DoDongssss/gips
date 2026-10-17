import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatChange, formatQty } from '@/lib/inventory';
import { formatPeso } from '@/lib/money';
import { index } from '@/routes/inventory/reports';

type UsageRow = {
    ingredient_id: number;
    ingredient: string;
    unit: string;
    purchased: number;
    used: number;
    waste: number;
    variance: number;
    used_cost_cents: number;
    waste_cost_cents: number;
    variance_cost_cents: number;
};

type MarginRow = {
    product_id: number;
    product: string;
    variant: string | null;
    price_cents: number;
    cost_cents: number | null;
    margin_cents: number | null;
    food_cost_pct: number | null;
};

type StockRow = {
    id: number;
    name: string;
    unit: string | null;
    quantity: string;
    reorder_level: string;
    value_cents: number;
    is_negative: boolean;
    is_low: boolean;
};

type Props = {
    range: { from: string; to: string };
    summary: { cogs_cents: number; net_sales_cents: number; food_cost_pct: number | null };
    // Optional on the server: each loads when its tab is opened.
    usage?: UsageRow[];
    margins?: MarginRow[];
    stock?: StockRow[];
};

// Food cost bands for the colour of a percentage. Change these to your own targets.
const GOOD_UNDER = 30;
const WARN_UNDER = 40;

function PctBadge({ pct }: { pct: number | null }) {
    if (pct === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    const tone = pct < GOOD_UNDER ? 'bg-green-100 text-green-800 hover:bg-green-100' : pct < WARN_UNDER ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-red-100 text-red-800 hover:bg-red-100';

    return <Badge className={tone}>{pct}%</Badge>;
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

    function apply() {
        router.get(index.url(), { from, to }, { preserveState: true, replace: true, only: ['range', 'summary', 'usage', 'margins', 'stock'] });
    }

    // Each report is fetched the first time its tab opens.
    function open(next: string) {
        setTab(next);

        const prop = next === 'usage' ? usage : next === 'margins' ? margins : stock;
        const name = next === 'usage' ? 'usage' : next === 'margins' ? 'margins' : 'stock';

        if (prop === undefined) {
            router.reload({ only: [name] });
        }
    }

    // The first tab loads on arrival.
    if (usage === undefined && tab === 'usage' && typeof window !== 'undefined') {
        queueMicrotask(() => router.reload({ only: ['usage'] }));
    }

    const stockValue = (stock ?? []).reduce((sum, row) => sum + row.value_cents, 0);

    return (
        <>
            <Head title="Inventory costs" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Inventory costs</h1>
                    <p className="text-muted-foreground text-sm">Food cost, margins, usage and where stock went missing.</p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground text-xs">From</span>
                        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground text-xs">To</span>
                        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
                    </label>
                    <Button variant="outline" onClick={apply}>
                        Apply
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Stat label="Food cost" value={summary.food_cost_pct === null ? '—' : `${summary.food_cost_pct}%`} hint="Cost of ingredients sold ÷ net sales" />
                    <Stat label="Cost of ingredients sold" value={formatPeso(summary.cogs_cents)} hint="Recipes deducted at the cost on the day" />
                    <Stat label="Net sales" value={formatPeso(summary.net_sales_cents)} hint="Paid orders, before tax" />
                </div>

                <Tabs value={tab} onValueChange={open}>
                    <TabsList>
                        <TabsTrigger value="usage">Usage &amp; variance</TabsTrigger>
                        <TabsTrigger value="margins">Margins by product</TabsTrigger>
                        <TabsTrigger value="stock">Stock on hand</TabsTrigger>
                    </TabsList>

                    <TabsContent value="usage" className="pt-3">
                        {usage === undefined ? (
                            <Loading />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">
                                    <strong>Variance</strong> is stock that appeared or vanished beyond recipes and logged waste, from counts and manual adjustments. Negative means missing.
                                </p>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground border-b text-left">
                                            <tr>
                                                <th className="p-3 font-medium">Ingredient</th>
                                                <th className="p-3 text-right font-medium">Bought</th>
                                                <th className="p-3 text-right font-medium">Used by sales</th>
                                                <th className="p-3 text-right font-medium">Waste</th>
                                                <th className="p-3 text-right font-medium">Variance</th>
                                                <th className="p-3 text-right font-medium">Cost of use</th>
                                                <th className="p-3 text-right font-medium">Cost of waste</th>
                                                <th className="p-3 text-right font-medium">Cost of variance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usage.map((row) => (
                                                <tr key={row.ingredient_id} className="border-b last:border-0">
                                                    <td className="p-3 font-medium">{row.ingredient}</td>
                                                    <td className="p-3 text-right tabular-nums">
                                                        {formatQty(row.purchased)} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums">
                                                        {formatQty(row.used)} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums">
                                                        {formatQty(row.waste)} {row.unit}
                                                    </td>
                                                    <td className={`p-3 text-right tabular-nums ${row.variance < 0 ? 'font-medium text-red-600' : ''}`}>
                                                        {row.variance === 0 ? '—' : `${formatChange(row.variance)} ${row.unit}`}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums">{formatPeso(row.used_cost_cents)}</td>
                                                    <td className="p-3 text-right tabular-nums">{formatPeso(row.waste_cost_cents)}</td>
                                                    <td className={`p-3 text-right tabular-nums ${row.variance_cost_cents < 0 ? 'text-red-600' : ''}`}>
                                                        {row.variance_cost_cents === 0 ? '—' : formatPeso(row.variance_cost_cents)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {usage.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="text-muted-foreground p-8 text-center">
                                                        No stock movements in this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="margins" className="pt-3">
                        {margins === undefined ? (
                            <Loading />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">Recipe cost at today&apos;s average ingredient costs against the selling price. Highest food cost first.</p>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground border-b text-left">
                                            <tr>
                                                <th className="p-3 font-medium">Product</th>
                                                <th className="p-3 text-right font-medium">Price</th>
                                                <th className="p-3 text-right font-medium">Recipe cost</th>
                                                <th className="p-3 text-right font-medium">Margin</th>
                                                <th className="p-3 text-right font-medium">Food cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {margins.map((row, i) => (
                                                <tr key={`${row.product_id}-${row.variant ?? i}`} className="border-b last:border-0">
                                                    <td className="p-3 font-medium">
                                                        {row.product}
                                                        {row.variant && <span className="text-muted-foreground font-normal"> · {row.variant}</span>}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums">{formatPeso(row.price_cents)}</td>
                                                    <td className="p-3 text-right tabular-nums">
                                                        {row.cost_cents === null ? <span className="text-amber-700">Needs a unit conversion</span> : formatPeso(row.cost_cents)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums">{row.margin_cents === null ? '—' : formatPeso(row.margin_cents)}</td>
                                                    <td className="p-3 text-right">
                                                        <PctBadge pct={row.food_cost_pct} />
                                                    </td>
                                                </tr>
                                            ))}
                                            {margins.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-muted-foreground p-8 text-center">
                                                        No recipes yet. Add them from each product&apos;s Recipe tab.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="stock" className="pt-3">
                        {stock === undefined ? (
                            <Loading />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">Value of stock on hand at average cost: {formatPeso(stockValue)}. Negative stock counts as zero.</p>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground border-b text-left">
                                            <tr>
                                                <th className="p-3 font-medium">Ingredient</th>
                                                <th className="p-3 text-right font-medium">On hand</th>
                                                <th className="p-3 text-right font-medium">Reorder at</th>
                                                <th className="p-3 text-right font-medium">Value</th>
                                                <th className="p-3 font-medium" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stock.map((row) => (
                                                <tr key={row.id} className="border-b last:border-0">
                                                    <td className="p-3 font-medium">{row.name}</td>
                                                    <td className="p-3 text-right tabular-nums">
                                                        {formatQty(row.quantity)} {row.unit}
                                                    </td>
                                                    <td className="text-muted-foreground p-3 text-right tabular-nums">{Number(row.reorder_level) > 0 ? formatQty(row.reorder_level) : '—'}</td>
                                                    <td className="p-3 text-right tabular-nums">{formatPeso(row.value_cents)}</td>
                                                    <td className="p-3">
                                                        {row.is_negative ? (
                                                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>
                                                        ) : row.is_low ? (
                                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low</Badge>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
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
