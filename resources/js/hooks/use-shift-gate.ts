import { useQuery } from '@tanstack/react-query';

import { useCan } from '@/hooks/use-can';
import { configQuery } from '@/lib/pos-api';
import type { PosConfig } from '@/pages/orders/types';

export type ShiftState = PosConfig['shift'];

/**
 * The cashier's shift, from GET /api/v1/pos/config (shared cache with the register).
 * `blocked` is true only when "require an open shift" is on, this person can open one, and none is open,
 * which is exactly when the server sends them to the Shift page.
 */
export function useShiftGate() {
    const { can } = useCan();
    const config = useQuery(configQuery);

    const shift = config.data?.shift ?? null;
    const blocked = shift !== null && shift.required && !shift.open && can('shift.open');

    return { shift, blocked, loaded: config.isSuccess };
}
