import { useAlerts } from '@/hooks/use-alerts';
import type { LowStock } from '@/types/inventory';

const EMPTY: LowStock = { count: 0, items: [] };

/** Ingredients at or under their reorder level, worst first. Comes from the shared alerts request (see use-alerts.ts). */
export function useLowStock() {
    return useAlerts((alerts) => alerts.stock ?? EMPTY);
}
