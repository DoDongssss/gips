import { uuid } from '@/lib/uuid';
import type { CartPayload } from '@/lib/pos-api';
import { posGet, posPost } from '@/lib/pos-http';
import type { OrderDetail } from '@/pages/orders/types';
import { useCartStore } from '@/stores/cart-store';
import { useOrderEdit } from '@/stores/order-edit-store';

type CartResponse = {
    order: { id: number; order_number: string };
    type: 'dine_in' | 'takeout';
    customer_name: string | null;
    notes: string | null;
    lines: {
        product_id: number;
        name: string;
        image_url: string | null;
        variant_id: number | null;
        variant_name: string | null;
        modifier_ids: number[];
        modifier_names: string[];
        notes: string;
        quantity: number;
        price_override: { unit_price_cents: number; reason: string } | null;
    }[];
    discounts: { discount_id: number; name: string; id_number: string; item_index: number | null }[];
};

/** Put a saved, unpaid order back into the register cart so the cashier can change it. */
export async function startEditing(orderId: number): Promise<void> {
    const { data } = await posGet<{ data: CartResponse }>(`/api/v1/pos/orders/${orderId}/cart`);

    const lines = data.lines.map((line) => ({ ...line, uid: uuid() }));

    useCartStore.setState({
        type: data.type,
        customerName: data.customer_name ?? '',
        notes: data.notes ?? '',
        lines,
        discounts: data.discounts.map((d) => ({
            uid: uuid(),
            discount_id: d.discount_id,
            name: d.name,
            requires_approval: false,
            id_number: d.id_number,
            line_uid: d.item_index !== null ? (lines[d.item_index]?.uid ?? null) : null,
        })),
        approval: null,
    });

    useOrderEdit.getState().start(data.order);
}

/** Leave edit mode and empty the cart. */
export function cancelEditing(): void {
    useCartStore.getState().clear();
    useOrderEdit.getState().stop();
}

/** Save the cart onto the order it came from. The server prices it again. */
export async function updateOrder(orderId: number, payload: CartPayload, key: string): Promise<OrderDetail> {
    return (await posPost<{ data: OrderDetail }>(`/api/v1/pos/orders/${orderId}/update`, payload, key)).data;
}
