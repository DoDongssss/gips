import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useState } from 'react';

import { AreaChart, BarList, ColumnChart, ShareBar } from './charts';
import { Card, Empty, Stat } from './card';
import { delta, int, peso, pesoCompact, percent, words } from './format';
import type { InventoryStats, Range, Sales, Summary } from './types';
import { cn } from '@/lib/utils';

function Delta({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
    const d = delta(current, previous);

    if (d === null) return <span className="text-muted-foreground text-xs">new</span>;
    if (Math.abs(d) < 0.0005) return (
        <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs"><Minus className="size-3" /> no change</span>
    );

    const up = d > 0;
    const good = inverse ? !up : up;
    const Icon = up ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            <Icon className="size-3.5" />
            {percent(Math.abs(d), Math.abs(d) < 0.1 ? 1 : 0)}
        </span>
    );
}

/** Net sales, orders, average order, items, with the change against the period before. */
export function KpiRow({ cur, prev, range }: { cur: Summary; prev: Summary; range: Range }) {
    const vs = range.days === 1 ? (range.key === 'today' ? 'vs yesterday' : 'vs the day before') : `vs previous ${range.days} days`;

    const tiles = [
        { label: 'Net sales', value: peso(cur.net_cents), c: cur.net_cents, p: prev.net_cents },
        { label: 'Orders', value: int(cur.orders), c: cur.orders, p: prev.orders },
        { label: 'Average order', value: peso(cur.avg_order_cents), c: cur.avg_order_cents, p: prev.avg_order_cents },
        { label: 'Items sold', value: int(cur.items), c: cur.items, p: prev.items },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((t) => (
                <Card key={t.label}>
                    <p className="text-muted-foreground text-xs">{t.label}</p>
                    <p className="mt-1 truncate text-2xl font-semibold tabular-nums">{t.value}</p>
                    <p className="mt-1 flex items-center gap-1.5">
                        <Delta current={t.c} previous={t.p} />
                        <span className="text-muted-foreground text-xs">{vs}</span>
                    </p>
                </Card>
            ))}
        </div>
    );
}

/** The money that explains the difference between gross and net. */
export function Breakdown({ s }: { s: Summary }) {
    return (
        <Card title="Where the money went" hint="Gross sales down to net">
            <dl className="space-y-2 text-sm">
                <Row label="Gross sales" value={peso(s.gross_cents)} strong />
                <Row label="Refunds" value={`− ${peso(s.refund_cents)}`} sub={s.refund_count > 0 ? `${s.refund_count} refund${s.refund_count === 1 ? '' : 's'}` : undefined} />
                <Row label="Net sales" value={peso(s.net_cents)} strong />
                <hr className="border-border" />
                <Row label="Discounts given" value={peso(s.discount_cents)} muted />
                <Row label="Tax collected" value={peso(s.tax_cents)} muted />
                <Row label="Tips" value={peso(s.tip_cents)} muted />
                <Row label="Voided orders" value={int(s.voided)} muted />
                <Row label="Cancelled orders" value={int(s.cancelled)} muted />
            </dl>
        </Card>
    );
}

function Row({ label, value, sub, strong, muted }: { label: string; value: string; sub?: string; strong?: boolean; muted?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className={cn(muted && 'text-muted-foreground')}>
                {label}
                {sub && <span className="text-muted-foreground ml-2 text-xs">{sub}</span>}
            </dt>
            <dd className={cn('tabular-nums', strong && 'font-semibold', muted && 'text-muted-foreground')}>{value}</dd>
        </div>
    );
}

export function TrendCard({ sales, range }: { sales: Sales; range: Range }) {
    const { trend } = sales;
    const hourly = trend.unit === 'hour';
    const every = hourly ? 3 : Math.max(1, Math.ceil(trend.points.length / 8));
    const empty = trend.points.every((p) => p.cents === 0);

    return (
        <Card title="Sales over time" hint={hourly ? 'By hour. The dashed line is the day before.' : 'By day. The dashed line is the previous period.'} className="lg:col-span-2">
            {empty ? (
                <Empty>No sales in this period yet.</Empty>
            ) : (
                <AreaChart
                    points={trend.points.map((p) => ({ label: p.label, value: p.cents, prev: p.prev_cents, note: `${p.orders} order${p.orders === 1 ? '' : 's'}` }))}
                    format={(n) => peso(n)}
                    axisFormat={pesoCompact}
                    labelEvery={every}
                />
            )}
            <span className="sr-only">{range.label}</span>
        </Card>
    );
}

export function PaymentsCard({ sales }: { sales: Sales }) {
    return (
        <Card title="Payment methods" hint="Money received in this period">
            <BarList
                empty="No payments yet."
                rows={sales.payments.map((p) => ({ label: p.name, value: p.cents, display: peso(p.cents), sub: `${int(p.count)} payment${p.count === 1 ? '' : 's'}` }))}
            />
        </Card>
    );
}

export function ProductsCard({ sales }: { sales: Sales }) {
    const [by, setBy] = useState<'qty' | 'revenue'>('qty');
    const rows = by === 'qty' ? sales.products.by_quantity : sales.products.by_revenue;

    return (
        <Card
            title="Best sellers"
            action={
                <div className="bg-muted flex rounded-md p-0.5 text-xs">
                    {(['qty', 'revenue'] as const).map((k) => (
                        <button key={k} type="button" onClick={() => setBy(k)} className={cn('rounded px-2 py-1 transition-colors', by === k ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground')}>
                            {k === 'qty' ? 'Quantity' : 'Revenue'}
                        </button>
                    ))}
                </div>
            }
        >
            <BarList
                empty="No items sold yet."
                rows={rows.map((p) => ({ label: p.name, value: by === 'qty' ? p.qty : p.cents, display: by === 'qty' ? `${int(p.qty)} sold` : peso(p.cents), sub: by === 'qty' ? peso(p.cents) : `${int(p.qty)} sold` }))}
            />
        </Card>
    );
}

export function CategoriesCard({ sales }: { sales: Sales }) {
    return (
        <Card title="Sales by category">
            <BarList empty="No items sold yet." rows={sales.categories.map((c) => ({ label: c.name, value: c.cents, display: peso(c.cents), sub: `${int(c.qty)} item${c.qty === 1 ? '' : 's'}` }))} />
        </Card>
    );
}

export function ChannelsCard({ sales }: { sales: Sales }) {
    return (
        <Card title="How customers order">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Channel</p>
            <ShareBar parts={sales.channels.map((c) => ({ label: words(c.key), value: c.cents, display: peso(c.cents, false) }))} />
            <p className="text-muted-foreground mt-5 mb-2 text-xs font-medium tracking-wide uppercase">Order type</p>
            <ShareBar parts={sales.types.map((c) => ({ label: words(c.key), value: c.cents, display: peso(c.cents, false) }))} />
        </Card>
    );
}

export function HoursCard({ sales }: { sales: Sales }) {
    const busiest = sales.hours.reduce((best, h) => (h.orders > best.orders ? h : best), sales.hours[0]);

    return (
        <Card title="Busiest hours" hint={busiest && busiest.orders > 0 ? `Peak is ${busiest.label} with ${busiest.orders} order${busiest.orders === 1 ? '' : 's'}` : 'Orders by hour of the day'} className="lg:col-span-2">
            <ColumnChart bars={sales.hours.map((h) => ({ label: h.label, value: h.orders }))} format={(n) => `${n} order${n === 1 ? '' : 's'}`} />
        </Card>
    );
}

export function StaffCard({ sales }: { sales: Sales }) {
    return (
        <Card title="Sales by staff" hint="Who rang the orders up">
            <BarList empty="No sales yet." rows={sales.staff.map((s) => ({ label: s.name, value: s.cents, display: peso(s.cents), sub: `${int(s.orders)} order${s.orders === 1 ? '' : 's'}` }))} />
        </Card>
    );
}

/** Cost of goods from recipes against what was sold. Needs both report.view and inventory.view. */
export function FoodCostCard({ sales, inventory }: { sales: Sales; inventory: InventoryStats }) {
    const net = sales.summary.net_cents;
    const ratio = net > 0 ? inventory.cogs_cents / net : null;
    const tone = ratio === null ? undefined : ratio < 0.3 ? 'good' : ratio < 0.4 ? 'warning' : 'danger';

    return (
        <Card title="Food cost" hint="Ingredients used by recipes against net sales">
            <div className="grid grid-cols-2 gap-4">
                <Stat label="Food cost" value={ratio === null ? '—' : percent(ratio, 1)} tone={tone} sub="of net sales" />
                <Stat label="Ingredient cost" value={peso(inventory.cogs_cents)} sub="used this period" />
                <Stat label="Gross profit" value={peso(net - inventory.cogs_cents)} sub="net sales minus ingredients" />
                <Stat label="Waste" value={peso(inventory.waste_cents)} tone={inventory.waste_cents > 0 ? 'warning' : undefined} sub="logged this period" />
            </div>
        </Card>
    );
}
