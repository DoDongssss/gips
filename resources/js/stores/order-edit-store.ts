import { create } from 'zustand';

const STORAGE_KEY = 'pos.editing-order';

/** Which saved order the register cart is currently editing (null when it holds a new order). */
type EditState = {
    editing: { id: number; order_number: string } | null;
    start: (order: { id: number; order_number: string }) => void;
    stop: () => void;
};

export function readPersistedEditingOrder(): { id: number; order_number: string } | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as { id: number; order_number: string };

        return parsed?.id ? parsed : null;
    } catch {
        return null;
    }
}

export const useOrderEdit = create<EditState>((set) => ({
    editing: null,
    start: (editing) => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(editing));
        set({ editing });
    },
    stop: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        set({ editing: null });
    },
}));
