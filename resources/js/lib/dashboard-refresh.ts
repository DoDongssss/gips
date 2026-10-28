import { router } from '@inertiajs/react';

let timer: number | undefined;

/** When an alert push arrives and the dashboard is open, reload the blocks that show alerts (debounced). */
export function refreshDashboard(): void {
    if (window.location.pathname !== '/dashboard') {
        return;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
        router.reload({ only: ['inventory', 'kiosk', 'alerts'] });
    }, 800);
}
