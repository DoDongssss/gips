import { create } from 'zustand';

/** Which saved order the register cart is currently editing (null when it holds a new order). */
type EditState = {
    editing: { id: number; order_number: string } | null;
    start: (order: { id: number; order_number: string }) => void;
    stop: () => void;
};

export const useOrderEdit = create<EditState>((set) => ({
    editing: null,
    start: (editing) => set({ editing }),
    stop: () => set({ editing: null }),
}));
