import { create } from 'zustand';

import type { PosOrderRow } from '@/lib/pos-session';
import { readSessionStart, writeSessionStart } from '@/lib/pos-session';

export type DrawerTab = 'unpaid' | 'all';

type PosUiState = {
    /** Which tab of the orders drawer is open; null = closed. */
    drawer: DrawerTab | null;
    /** A saved order the cashier chose to pay from the drawer. */
    payingOrder: PosOrderRow | null;
    /** Start of the cashier's session (ISO). */
    since: string;

    openDrawer: (tab: DrawerTab) => void;
    closeDrawer: () => void;
    startPaying: (order: PosOrderRow) => void;
    clearPaying: () => void;
    newSession: () => void;
};

export const usePosUi = create<PosUiState>((set) => ({
    drawer: null,
    payingOrder: null,
    since: readSessionStart(),

    openDrawer: (drawer) => set({ drawer }),
    closeDrawer: () => set({ drawer: null }),
    startPaying: (payingOrder) => set({ payingOrder, drawer: null }),
    clearPaying: () => set({ payingOrder: null }),
    newSession: () => set({ since: writeSessionStart() }),
}));
