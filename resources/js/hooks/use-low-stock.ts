import { useQuery } from '@tanstack/react-query';

import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { lowStock } from '@/routes/inventory';
import type { LowStock } from '@/types/inventory';

/**
 * Ingredients at or under their reorder level, worst first. Refreshes every minute so the bell
 * stays current while the register is open. Only runs for people who may see inventory.
 */
export function useLowStock() {
    const { can } = useCan();
    const allowed = can('inventory.view');

    return useQuery({
        queryKey: ['inventory', 'low-stock'],
        queryFn: () => api<LowStock>(lowStock.url()),
        enabled: allowed,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}
