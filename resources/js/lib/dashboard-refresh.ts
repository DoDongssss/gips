import { router } from '@inertiajs/react';

let timer: number | undefined;

const ALERT_ONLY = ['inventory', 'kiosk', 'attention'] as const;
const LIVE_ONLY = ['live', 'shifts', 'attention'] as const;
const SALES_ONLY = ['sales', 'attention'] as const;

type ReloadOptions = {
    only: readonly string[];
};

function debouncedReload({ only, onSuccess }: ReloadOptions & { onSuccess?: () => void }): void {
    if (window.location.pathname !== '/dashboard') {
        return;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
        router.reload({ only: [...only], onSuccess });
    }, 800);
}

/** Device, printer, or stock alert pushes (header bells). */
export function refreshDashboardAlerts(onSuccess?: () => void): void {
    debouncedReload({ only: ALERT_ONLY, onSuccess });
}

/** Order or kitchen pushes: live pipeline, shifts, and attention. */
export function refreshDashboardLive(onSuccess?: () => void): void {
    debouncedReload({ only: LIVE_ONLY, onSuccess });
}

/** Today&apos;s sales KPIs after an order changes. */
export function refreshDashboardSales(onSuccess?: () => void): void {
    debouncedReload({ only: SALES_ONLY, onSuccess });
}
