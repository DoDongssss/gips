// Shapes returned by OrderResource, the orders list and /api/v1/pos/config.

export type OrderStatus = 'open' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'voided';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type OrderType = 'dine_in' | 'takeout' | 'delivery';
export type OrderChannel = 'pos' | 'kiosk' | 'online' | 'delivery';

export type OrderRow = {
    id: number;
    order_number: string;
    channel: OrderChannel;
    type: OrderType;
    status: OrderStatus;
    payment_status: PaymentStatus;
    customer_name: string | null;
    total_cents: number;
    paid_cents: number;
    cashier: string | null;
    created_at: string | null;
};

export type ReceiptContent = {
    business: { name: string | null; address: string | null; tin: string | null; phone: string | null };
    header: string | null;
    footer: string | null;
    order_number: string;
    order_type: OrderType;
    business_date: string;
    issued_at: string;
    cashier: string | null;
    customer_name: string | null;
    items: {
        name: string;
        variant: string | null;
        quantity: number;
        unit_price_cents: number;
        modifiers: { name: string; price_delta_cents: number }[];
        discount_cents: number;
        line_total_cents: number;
        notes: string | null;
    }[];
    discounts: { name: string; amount_cents: number; id_number: string | null }[];
    tax: {
        name: string;
        rate: string;
        is_inclusive: boolean;
        vatable_sales_cents: number;
        tax_cents: number;
    } | null;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    tip_cents: number;
    total_cents: number;
    payments: {
        method: string;
        amount_cents: number;
        tendered_cents: number | null;
        change_cents: number;
        reference_no: string | null;
    }[];
};

export type OrderReceipt = {
    id: number;
    receipt_number: string;
    type: 'sale' | 'refund' | 'void';
    printed_count: number;
    content: ReceiptContent;
};

export type OrderItem = {
    id: number;
    product_id: number;
    product_name: string;
    variant_name: string | null;
    unit_price_cents: number;
    /** Set when a manager-approved price change was applied: the list price before it. */
    original_unit_price_cents?: number | null;
    price_override_reason?: string | null;
    quantity: number;
    modifiers_total_cents: number;
    discount_cents: number;
    tax_cents: number;
    line_total_cents: number;
    status: string;
    notes: string | null;
    modifiers: { group_name: string; modifier_name: string; price_delta_cents: number }[];
};

export type OrderPayment = {
    id: number;
    uuid: string;
    method: string | null;
    method_code: string | null;
    amount_cents: number;
    tendered_cents: number | null;
    change_cents: number;
    tip_cents: number;
    status: string;
    /** Total already returned on this payment, when the API reports it. */
    refunded_cents?: number;
    reference_no: string | null;
    paid_at: string | null;
};

export type OrderDetail = {
    id: number;
    uuid: string;
    order_number: string;
    business_date: string;
    channel: OrderChannel;
    type: OrderType;
    status: OrderStatus;
    payment_status: PaymentStatus;
    customer_name: string | null;
    notes: string | null;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    tip_cents: number;
    total_cents: number;
    paid_cents: number;
    balance_cents: number;
    requires_verification: boolean;
    cancel_reason: string | null;
    created_at: string | null;
    confirmed_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    items?: OrderItem[];
    discounts?: {
        name: string;
        type: string;
        value: number;
        amount_cents: number;
        order_item_id: number | null;
        id_number: string | null;
        approved_by: number | null;
    }[];
    taxes?: { name: string; rate: string; is_inclusive: boolean; taxable_cents: number; tax_cents: number }[];
    payments?: OrderPayment[];
    refunds?: { id: number; payment_id: number; amount_cents: number; reason: string | null; refunded_at: string | null }[];
    receipts?: OrderReceipt[];
    status_history?: { from: string | null; to: string; note: string | null; at: string | null }[];
};

export type Approver = { id: number; name: string };

export type PosDiscount = {
    id: number;
    name: string;
    type: 'percent' | 'fixed';
    value: number;
    applies_to: 'order' | 'item';
    requires_id: boolean;
    requires_approval: boolean;
    is_vat_exempt: boolean;
};

export type PaymentMethodOption = {
    code: string;
    name: string;
    type: 'cash' | 'card' | 'ewallet' | 'other';
    requires_reference: boolean;
};

export type PosConfig = {
    shift: { required: boolean; open: boolean; opened_at: string | null };
    discounts: PosDiscount[];
    payment_methods: PaymentMethodOption[];
    tax: { name: string; rate: string; is_inclusive: boolean } | null;
    approvers: Approver[];
};
