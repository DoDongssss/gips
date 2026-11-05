import { uuid } from '@/lib/uuid';
import type { CartPayload } from '@/lib/pos/api';
import { newIdempotencyKey } from '@/lib/pos/api';
import { posGet, posPost } from '@/lib/pos/http';
import type { OrderDetail } from '@/types/orders';
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

export type EditableOrderLine = {
    id: number;
    name: string;
    variant: string | null;
    modifiers: string[];
    unit_cents: number;
    quantity: number;
};

export type EditableOrder = {
    order_number: string;
    total_cents: number;
    editable: boolean;
    lines: EditableOrderLine[];
};

function orderIsEditable(order: OrderDetail): boolean {
    return order.status === 'open' && order.payment_status === 'unpaid' && order.paid_cents === 0;
}

/** Load an unpaid order for quick quantity edits (order item ids, not cart uids). */
export async function loadEditableOrder(orderId: number): Promise<EditableOrder> {
    const order = (await posGet<{ data: OrderDetail }>(`/api/v1/orders/${orderId}`)).data;

    return {
        order_number: order.order_number,
        total_cents: order.total_cents,
        editable: orderIsEditable(order),
        lines: (order.items ?? []).map((item) => ({
            id: item.id,
            name: item.product_name,
            variant: item.variant_name,
            modifiers: item.modifiers.map((modifier) => modifier.modifier_name),
            unit_cents: item.unit_price_cents,
            quantity: item.quantity,
        })),
    };
}

/**
 * Apply quantity changes (or remove lines) and re-price on the server.
 * Rebuilds the cart payload from the order's cart snapshot so modifiers and discounts stay intact.
 */
export async function saveOrderLines(orderId: number, lines: { id: number; quantity: number }[]): Promise<OrderDetail> {
    const quantityById = new Map(lines.map((line) => [line.id, line.quantity]));

    const [{ data: cart }, { data: order }] = await Promise.all([
        posGet<{ data: CartResponse }>(`/api/v1/pos/orders/${orderId}/cart`),
        posGet<{ data: OrderDetail }>(`/api/v1/orders/${orderId}`),
    ]);

    if (!orderIsEditable(order)) {
        throw new Error('This order can no longer be changed.');
    }

    const orderItems = order.items ?? [];
    const items: CartPayload['items'] = [];

    for (let index = 0; index < orderItems.length; index++) {
        const item = orderItems[index];
        const quantity = quantityById.get(item.id);

        if (quantity === undefined) {
            continue;
        }

        const cartLine = cart.lines[index];

        if (!cartLine || cartLine.product_id !== item.product_id) {
            throw new Error('This order changed on the server. Close the dialog and try again.');
        }

        items.push({
            product_id: cartLine.product_id,
            variant_id: cartLine.variant_id,
            quantity,
            modifiers: cartLine.modifier_ids,
            notes: cartLine.notes.trim() || null,
            ...(cartLine.price_override ? { price_override: cartLine.price_override } : {}),
        });
    }

    if (items.length === 0) {
        throw new Error('Leave at least one item on the order.');
    }

    const payload: CartPayload = {
        type: cart.type,
        customer_name: cart.customer_name,
        notes: cart.notes,
        items,
        discounts: cart.discounts.map((discount) => ({
            discount_id: discount.discount_id,
            id_number: discount.id_number.trim() || null,
            item_index: discount.item_index,
        })),
    };

    return updateOrder(orderId, payload, newIdempotencyKey());
}
