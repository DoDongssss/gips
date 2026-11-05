import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Approval, CartPayload } from '@/lib/pos/api';
import { uuid } from '@/lib/uuid';

/**
 * The register's cart. It holds choices only (which product, size, add-ons, discounts):
 * prices always come back from the server through /orders/preview.
 */
export type CartLine = {
    uid: string;
    product_id: number;
    name: string;
    image_url: string | null;
    variant_id: number | null;
    variant_name: string | null;
    modifier_ids: number[];
    modifier_names: string[];
    notes: string;
    quantity: number;
    /** A manager-approved change to the unit price (before add-ons), in centavos. The server checks it. */
    price_override?: { unit_price_cents: number; reason: string } | null;
};

export type CartDiscount = {
    uid: string;
    discount_id: number;
    name: string;
    requires_approval: boolean;
    id_number: string;
    /** The cart line an item discount belongs to; null for whole-order discounts. */
    line_uid: string | null;
};

type CartState = {
    type: 'dine_in' | 'takeout';
    customerId: number | null;
    customerPhone: string;
    customerName: string;
    notes: string;
    lines: CartLine[];
    discounts: CartDiscount[];
    approval: Approval | null;
    loyaltyPointsRedeem: number;

    setType: (type: 'dine_in' | 'takeout') => void;
    setCustomerName: (value: string) => void;
    setCustomerPhone: (value: string) => void;
    setCustomer: (value: { customerId: number | null; name: string; phone: string }) => void;
    setLoyaltyPointsRedeem: (value: number) => void;
    setNotes: (value: string) => void;
    addLine: (line: Omit<CartLine, 'uid'>) => void;
    updateLine: (uid: string, line: Omit<CartLine, 'uid'>) => void;
    setPriceOverride: (uid: string, override: { unit_price_cents: number; reason: string } | null) => void;
    setQuantity: (uid: string, quantity: number) => void;
    removeLine: (uid: string) => void;
    addDiscount: (discount: Omit<CartDiscount, 'uid'>) => void;
    removeDiscount: (uid: string) => void;
    setApproval: (approval: Approval | null) => void;
    clear: () => void;
};

const MAX_QUANTITY = 99;

const uid = () => uuid();

const sameChoice = (a: Omit<CartLine, 'uid' | 'quantity'>, b: Omit<CartLine, 'uid' | 'quantity'>) =>
    a.product_id === b.product_id &&
    a.variant_id === b.variant_id &&
    a.notes.trim() === b.notes.trim() &&
    [...a.modifier_ids].sort().join(',') === [...b.modifier_ids].sort().join(',');

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            type: 'takeout',
            customerId: null,
            customerPhone: '',
            customerName: '',
            notes: '',
            lines: [],
            discounts: [],
            approval: null,
            loyaltyPointsRedeem: 0,

            setType: (type) => set({ type }),
            setCustomerName: (customerName) => set({ customerName, customerId: null, loyaltyPointsRedeem: 0 }),
            setCustomerPhone: (customerPhone) => set({ customerPhone, customerId: null, loyaltyPointsRedeem: 0 }),
            setCustomer: ({ customerId, name, phone }) =>
                set({ customerId, customerName: name, customerPhone: phone, loyaltyPointsRedeem: 0 }),
            setLoyaltyPointsRedeem: (loyaltyPointsRedeem) => set({ loyaltyPointsRedeem: Math.max(0, loyaltyPointsRedeem) }),
            setNotes: (notes) => set({ notes }),

            addLine: (line) =>
                set((state) => {
                    // A line with a changed price never merges with another line.
                    const existing = line.price_override ? undefined : state.lines.find((l) => !l.price_override && sameChoice(l, line));

                    if (existing) {
                        return {
                            lines: state.lines.map((l) =>
                                l.uid === existing.uid
                                    ? {
                                          ...l,
                                          quantity: Math.min(MAX_QUANTITY, l.quantity + line.quantity),
                                      }
                                    : l,
                            ),
                        };
                    }

                    return { lines: [...state.lines, { ...line, uid: uid() }] };
                }),

            updateLine: (lineUid, line) =>
                set((state) => ({
                    lines: state.lines.map((l) => (l.uid === lineUid ? { ...line, uid: lineUid } : l)),
                })),

            setPriceOverride: (lineUid, override) =>
                set((state) => ({
                    lines: state.lines.map((l) => (l.uid === lineUid ? { ...l, price_override: override } : l)),
                })),

            setQuantity: (lineUid, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return {
                            lines: state.lines.filter((l) => l.uid !== lineUid),
                            discounts: state.discounts.filter((d) => d.line_uid !== lineUid),
                        };
                    }

                    return {
                        lines: state.lines.map((l) =>
                            l.uid === lineUid
                                ? {
                                      ...l,
                                      quantity: Math.min(MAX_QUANTITY, quantity),
                                  }
                                : l,
                        ),
                    };
                }),

            removeLine: (lineUid) =>
                set((state) => ({
                    lines: state.lines.filter((l) => l.uid !== lineUid),
                    // A discount tied to a removed item has nothing left to apply to.
                    discounts: state.discounts.filter((d) => d.line_uid !== lineUid),
                })),

            addDiscount: (discount) =>
                set((state) => ({
                    discounts: [...state.discounts, { ...discount, uid: uid() }],
                })),
            removeDiscount: (discountUid) =>
                set((state) => ({
                    discounts: state.discounts.filter((d) => d.uid !== discountUid),
                })),

            setApproval: (approval) => set({ approval }),

            clear: () =>
                set({
                    type: 'takeout',
                    customerId: null,
                    customerPhone: '',
                    customerName: '',
                    notes: '',
                    lines: [],
                    discounts: [],
                    approval: null,
                    loyaltyPointsRedeem: 0,
                }),
        }),
        {
            name: 'pos-cart',
            version: 2,
            // The manager approval holds a PIN, so it is never written to storage.
            partialize: (state) => ({
                type: state.type,
                customerId: state.customerId,
                customerPhone: state.customerPhone,
                customerName: state.customerName,
                notes: state.notes,
                lines: state.lines,
                discounts: state.discounts,
            }),
        },
    ),
);

/** The request body for /orders/preview and /orders. Names and prices never go to the server. */
export function buildCartPayload(
    state: Pick<
        CartState,
        'type' | 'customerId' | 'customerPhone' | 'customerName' | 'notes' | 'lines' | 'discounts' | 'approval' | 'loyaltyPointsRedeem'
    >,
    { withApproval }: { withApproval: boolean },
): CartPayload {
    return {
        type: state.type,
        customer_id: state.customerId,
        customer_phone: state.customerPhone.trim() || null,
        customer_name: state.customerName.trim() || null,
        loyalty_points_redeem: state.loyaltyPointsRedeem > 0 ? state.loyaltyPointsRedeem : undefined,
        notes: state.notes.trim() || null,
        items: state.lines.map((l) => ({
            product_id: l.product_id,
            variant_id: l.variant_id,
            quantity: l.quantity,
            modifiers: l.modifier_ids,
            notes: l.notes.trim() || null,
            ...(l.price_override ? { price_override: l.price_override } : {}),
        })),
        discounts: state.discounts.map((d) => ({
            discount_id: d.discount_id,
            id_number: d.id_number.trim() || null,
            item_index: d.line_uid ? state.lines.findIndex((l) => l.uid === d.line_uid) : null,
        })),
        ...(withApproval && state.approval ? { approval: state.approval } : {}),
    };
}
