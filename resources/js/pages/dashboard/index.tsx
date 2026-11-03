import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, CircleAlert, Info, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, Empty } from './card';
import { greeting, timeOf } from './format';
import { LiveStrip, RecentOrders, ShiftsCard } from './live';
import { Breakdown, CategoriesCard, ChannelsCard, FoodCostCard, HoursCard, KpiRow, PaymentsCard, ProductsCard, StaffCard, TrendCard } from './sales';
import { KioskCard, PurchasingCard, StockCard } from './stock';
import type { Alert, DashboardProps, RangeKey } from './types';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

/** How often the live blocks refresh by themselves. */
const REFRESH_MS = 30_000;

export default function Dashboard(props: DashboardProps) {
    const { range, access, live, shifts, sales, inventory, purchasing, kiosk, alerts } = props;
    const { auth } = usePage<{ auth?: { user?: { name?: string } } }>().props;

    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    // Keep the live blocks fresh without reloading the whole page. Skips while the tab is hidden.
    useEffect(() => {
        const only = ['live', 'shifts', 'alerts'].filter((k) => (k === 'alerts' ? true : (props as Record<string, unknown>)[k] !== null));

        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            router.reload({ only, onSuccess: () => setNow(Date.now()) });
        }, REFRESH_MS);

        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [access.live, access.shifts]);

    function choose(key: RangeKey) {
        if (key === range.key) return;

        router.get(dashboard.url({ query: { range: key } }), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['range', 'sales', 'inventory', 'kiosk', 'alerts'],
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    const nothing = !live && !sales && !shifts && !inventory && !purchasing && !kiosk;
    const firstName = auth?.user?.name?.split(' ')[0];

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-green-500" /></span>
                            Live · updated {timeOf(new Date(now).toISOString())}
                            <button type="button" onClick={() => router.reload({ onSuccess: () => setNow(Date.now()) })} className="hover:text-foreground ml-1" aria-label="Refresh now" title="Refresh now">
                                <RefreshCw className="size-3.5" />
                            </button>
                        </p>
                    </div>

                    {(sales || inventory || kiosk) && (
                        <div role="group" aria-label="Period" className="bg-muted flex rounded-lg p-1 text-sm">
                            {range.options.map((o) => (
                                <button key={o.key} type="button" onClick={() => choose(o.key)} aria-pressed={range.key === o.key} className={cn('rounded-md px-3 py-1.5 transition-colors', range.key === o.key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {alerts.length > 0 && <Alerts alerts={alerts} />}

                {nothing && (
                    <Card>
                        <Empty>There is nothing on the dashboard for your role yet. Ask the owner if you need access to more.</Empty>
                    </Card>
                )}

                <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'pointer-events-none opacity-60')}>
                    {live && <LiveStrip live={live} />}

                    {sales && <KpiRow cur={sales.summary} prev={sales.previous} range={range} />}

                    {sales && (
                        <div className="grid gap-4 lg:grid-cols-3">
                            <TrendCard sales={sales} range={range} />
                            <Breakdown s={sales.summary} />
                        </div>
                    )}

                    {sales && (
                        <div className="grid gap-4 lg:grid-cols-3">
                            <ProductsCard sales={sales} />
                            <CategoriesCard sales={sales} />
                            <PaymentsCard sales={sales} />
                        </div>
                    )}

                    {sales && (
                        <div className="grid gap-4 lg:grid-cols-3">
                            <HoursCard sales={sales} />
                            <ChannelsCard sales={sales} />
                        </div>
                    )}

                    {(live || shifts) && (
                        <div className="grid gap-4 lg:grid-cols-3">
                            {live && <RecentOrders live={live} now={now} />}
                            {shifts && <ShiftsCard shifts={shifts} mine={!access.sales} />}
                        </div>
                    )}

                    {(inventory || purchasing || kiosk || (sales && sales.staff.length > 0)) && (
                        <div className="grid gap-4 lg:grid-cols-3">
                            {inventory && <StockCard stock={inventory} />}
                            {sales && inventory && <FoodCostCard sales={sales} inventory={inventory} />}
                            {purchasing && <PurchasingCard p={purchasing} />}
                            {kiosk && <KioskCard kiosk={kiosk} range={range} now={now} />}
                            {sales && <StaffCard sales={sales} />}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

const alertStyle = {
    danger: { box: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200', Icon: CircleAlert },
    warning: { box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200', Icon: AlertTriangle },
    info: { box: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200', Icon: Info },
} as const;

function Alerts({ alerts }: { alerts: Alert[] }) {
    return (
        <ul className="grid gap-2 md:grid-cols-2">
            {alerts.map((a, i) => {
                const { box, Icon } = alertStyle[a.level];
                const body = (
                    <>
                        <Icon className="mt-0.5 size-4 shrink-0" />
                        <span className="text-sm">{a.text}</span>
                    </>
                );

                return (
                    <li key={i}>
                        {a.href ? (
                            <Link href={a.href} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 hover:underline', box)}>{body}</Link>
                        ) : (
                            <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2', box)}>{body}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
