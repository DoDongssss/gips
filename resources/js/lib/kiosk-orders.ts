import { queryOptions } from '@tanstack/react-query';

import { posGet } from '@/lib/pos-http';
import type { PosOrderRow } from '@/lib/pos-session';

/** An order placed on the kiosk tablet that still has to be paid at the counter. */
export type KioskOrderRow = PosOrderRow & { channel: 'kiosk'; requires_verification: boolean };

export const isKioskOrder = (order: PosOrderRow): order is KioskOrderRow => (order as Partial<KioskOrderRow>).channel === 'kiosk';

export const kioskOrdersQuery = () =>
    queryOptions({
        queryKey: ['pos', 'kiosk-orders'],
        queryFn: async () => (await posGet<{ data: KioskOrderRow[] }>('/api/v1/pos/kiosk-orders')).data,
        refetchInterval: 15_000,
        staleTime: 5_000,
    });
