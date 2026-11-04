import { LiveStrip, RecentOrders, ShiftsCard } from './live';
import {
    Breakdown,
    CategoriesCard,
    FinanceRow,
    FoodCostCard,
    HoursCard,
    KpiRow,
    MixCard,
    PaymentsCard,
    ProductsCard,
    StaffCard,
    TrendCard,
} from './sales';
import { KioskCard, PurchasingCard, StockCard } from './stock';
import { TodayHero } from './today-hero';
import type { DashboardMeta, InventoryStats, Kiosk, Live, Purchasing, Range, Sales, Shifts } from './types';

type Props = {
    meta: DashboardMeta;
    range: Range;
    live: Live | null | undefined;
    shifts: Shifts | null | undefined;
    sales: Sales;
    inventory: InventoryStats | null | undefined;
    purchasing: Purchasing | null | undefined;
    kiosk: Kiosk | null | undefined;
    now: number;
    showTodayHero: boolean;
};

/** Full admin dashboard: sales, live ops, inventory, and purchasing on one scroll. */
export function AdminDashboardView({ meta, range, live, shifts, sales, inventory, purchasing, kiosk, now, showTodayHero }: Props) {
    return (
        <>
            {showTodayHero && live && <TodayHero sales={sales} live={live} range={range} />}

            {!showTodayHero && <KpiRow cur={sales.summary} prev={sales.previous} range={range} />}

            <FinanceRow s={sales.summary} />

            {live && <LiveStrip live={live} />}

            <div className="grid gap-4 lg:grid-cols-3">
                <TrendCard sales={sales} range={range} />
                <Breakdown s={sales.summary} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <HoursCard sales={sales} />
                <PaymentsCard sales={sales} />
                <MixCard sales={sales} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <ProductsCard sales={sales} />
                <CategoriesCard sales={sales} />
                <StaffCard sales={sales} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {live && <RecentOrders live={live} now={now} businessDate={meta.business_date} />}
                {shifts && <ShiftsCard shifts={shifts} mine={false} />}
                {inventory && <FoodCostCard sales={sales} inventory={inventory} />}
            </div>

            {(inventory || purchasing || kiosk) && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inventory && <StockCard stock={inventory} />}
                    {purchasing && <PurchasingCard p={purchasing} />}
                    {kiosk && <KioskCard kiosk={kiosk} range={range} now={now} />}
                </div>
            )}
        </>
    );
}
