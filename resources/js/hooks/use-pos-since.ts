import { useShiftGate } from '@/hooks/use-shift-gate';
import { usePosUi } from '@/stores/pos-ui-store';

/**
 * Where "my sales" and "my orders" start counting. With an open shift it is the shift's start;
 * otherwise it is the register session stand-in from the UI store.
 */
export function usePosSince(): string {
    const stored = usePosUi((state) => state.since);
    const { shift } = useShiftGate();

    return shift?.open && shift.opened_at ? shift.opened_at : stored;
}
