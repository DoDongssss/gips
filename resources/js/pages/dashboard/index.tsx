import { Head, router, usePage } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRealtime } from '@/hooks/use-dashboard-realtime';
import { usePusherStatus } from '@/hooks/use-pusher-status';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

import { AdminDashboardView } from './admin-view';
import { AttentionStrip } from './attention';
import { Card, Empty, Pill } from './card';
import { DetailsSection } from './details';
import { greeting, timeOf } from './format';
import { LiveStrip, RecentOrders, ShiftsCard } from './live';
import { Breakdown, CategoriesCard, FoodCostCard, FinanceRow, HoursCard, KpiRow, MixCard, PaymentsCard, ProductsCard } from './sales';
import { KioskCard, PurchasingCard, StockCard } from './stock';
import { TodayHero } from './today-hero';
import type { DashboardProps, RangeKey } from './types';

const CLOCK_MS = 60_000;

const ONLY = ['live', 'shifts', 'sales', 'inventory', 'purchasing', 'kiosk', 'attention'] as const;

function RealtimeBadge({ status }: { status: ReturnType<typeof usePusherStatus> }) {
    if (status === 'off') {
        return <span className="text-muted-foreground text-xs">Manual refresh</span>;
    }

    return (
        <span className="flex items-center gap-1.5 text-xs">
            <span className="relative flex size-2">
                {status === 'live' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-50" />}
                <span className={cn('relative inline-flex size-2 rounded-full', status === 'live' ? 'bg-green-500' : 'bg-amber-500')} />
            </span>
            {status === 'live' ? 'Live' : 'Connecting…'}
        </span>
    );
}

export default function Dashboard(props: DashboardProps) {
    const { meta, range, access, can_load, live, shifts, sales, inventory, purchasing, kiosk, attention } = props;
    const { auth } = usePage<{ auth?: { user?: { name?: string } } }>().props;

    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const pusherStatus = usePusherStatus();

    const markUpdated = useCallback(() => setNow(Date.now()), []);

    useDashboardRealtime(access, range.key, markUpdated);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
        return () => window.clearInterval(timer);
    }, []);

    function refresh() {
        router.reload({
            only: [...ONLY],
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: markUpdated,
        });
    }

    function choose(key: RangeKey) {
        if (key === range.key) {
            return;
        }

        router.get(
            dashboard.url({ query: { range: key } }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: [...ONLY, 'range'],
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    const firstName = auth?.user?.name?.split(' ')[0];
    const isToday = range.key === 'today';
    const showTodayHero = isToday && sales && live;
    const showLiveStrip = live && !showTodayHero;
    const showKpi = sales && !showTodayHero;
    const updatedAt = live?.as_of ?? sales?.as_of ?? null;
    const attentionItems = attention ?? [];
    const layout = meta.layout;

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-0.5">
                        <h1 className="text-xl font-semibold tracking-tight">
                            {greeting()}
                            {firstName ? `, ${firstName}` : ''}
                        </h1>
                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                            <span>Business day {meta.business_date}</span>
                            {meta.day_closed && <Pill tone="warning">Day closed</Pill>}
                            <span aria-hidden>·</span>
                            <RealtimeBadge status={pusherStatus} />
                            {can_load && updatedAt && (
                                <>
                                    <span aria-hidden>·</span>
                                    <span suppressHydrationWarning>Updated {timeOf(updatedAt)}</span>
                                </>
                            )}
                            <button type="button" onClick={refresh} className="hover:text-foreground inline-flex items-center" aria-label="Refresh dashboard" title="Refresh">
                                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                            </button>
                        </p>
                    </div>

                    {can_load && (sales || inventory || kiosk) && (
                        <div role="group" aria-label="Period" className="bg-muted flex rounded-lg p-1 text-sm">
                            {range.options.map((o) => (
                                <button
                                    key={o.key}
                                    type="button"
                                    onClick={() => choose(o.key)}
                                    aria-pressed={range.key === o.key}
                                    className={cn(
                                        'rounded-md px-3 py-1.5 transition-colors',
                                        range.key === o.key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {!can_load && (
                    <Card>
                        <Empty>There is nothing on the dashboard for your role yet. Ask the owner if you need access to more.</Empty>
                    </Card>
                )}

                {can_load && attentionItems.length > 0 && <AttentionStrip items={attentionItems} />}

                {can_load && (
                    <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'pointer-events-none opacity-60')}>
                        {layout === 'owner' && sales && (
                            <AdminDashboardView
                                meta={meta}
                                range={range}
                                live={live}
                                shifts={shifts}
                                sales={sales}
                                inventory={inventory}
                                purchasing={purchasing}
                                kiosk={kiosk}
                                now={now}
                                showTodayHero={Boolean(showTodayHero)}
                            />
                        )}

                        {layout !== 'owner' && showTodayHero && sales && live && <TodayHero sales={sales} live={live} range={range} />}

                        {layout === 'cashier' && shifts && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <ShiftsCard shifts={shifts} mine />
                                {live && <RecentOrders live={live} now={now} businessDate={meta.business_date} />}
                            </div>
                        )}

                        {layout !== 'owner' && layout !== 'cashier' && showLiveStrip && live && <LiveStrip live={live} />}

                        {layout !== 'owner' && showKpi && sales && <KpiRow cur={sales.summary} prev={sales.previous} range={range} />}

                        {layout === 'kitchen' && live && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <RecentOrders live={live} now={now} businessDate={meta.business_date} />
                            </div>
                        )}

                        {layout === 'operations' && (
                            <div className="grid gap-4 lg:grid-cols-3">
                                {live && <RecentOrders live={live} now={now} businessDate={meta.business_date} />}
                                {shifts && <ShiftsCard shifts={shifts} mine={!access.sales} />}
                            </div>
                        )}

                        {layout !== 'owner' && (inventory || purchasing || kiosk) && (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {inventory && <StockCard stock={inventory} />}
                                {sales && inventory && <FoodCostCard sales={sales} inventory={inventory} />}
                                {purchasing && <PurchasingCard p={purchasing} />}
                                {kiosk && <KioskCard kiosk={kiosk} range={range} now={now} />}
                            </div>
                        )}

                        {layout !== 'owner' && sales && (
                            <DetailsSection title="More sales detail" defaultOpen>
                                <FinanceRow s={sales.summary} />
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <Breakdown s={sales.summary} />
                                    <MixCard sales={sales} />
                                    <PaymentsCard sales={sales} />
                                </div>
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <ProductsCard sales={sales} />
                                    <CategoriesCard sales={sales} />
                                    <HoursCard sales={sales} />
                                </div>
                            </DetailsSection>
                        )}

                        {layout === 'default' && live && !showTodayHero && (
                            <RecentOrders live={live} now={now} businessDate={meta.business_date} />
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
