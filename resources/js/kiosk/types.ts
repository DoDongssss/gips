// The menu as GET /api/v1/kiosk/menu returns it (same data as the register).
export type Modifier = { id: number; name: string; price_delta_cents: number; is_default: boolean; is_available: boolean };

export type ModifierGroup = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number | null;
    modifiers: Modifier[];
};

export type Variant = { id: number; name: string; price_cents: number; is_default: boolean };

export type Product = {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    base_price_cents: number;
    is_available: boolean;
    image_url: string | null;
    variants: Variant[];
    modifier_groups: ModifierGroup[];
};

export type Category = { id: number; name: string; slug: string; sort_order: number; products: Product[] };

export type KioskSettings = {
    language: string;
    theme: string | null;
    payment_mode: 'pay_at_counter';
    idle_timeout_seconds: number;
    upsell_enabled: boolean;
    large_text: boolean;
    is_out_of_service: boolean;
    welcome_message: string | null;
};

export type Status = {
    device: { id: number; name: string };
    settings: KioskSettings | null;
    unpaid_expiry_minutes: number;
    server_time: string;
};

export type Banner = { id: number; title: string; type: string; image_url: string | null; content: { headline?: string; subtext?: string } | null };

export type Suggestion = { product_id: number; message: string | null };

export type OrderType = 'dine_in' | 'takeout';

export type CartLine = { key: string; product: Product; variant: Variant | null; modifiers: Modifier[]; quantity: number };

export type PlacedOrder = {
    order_number: string;
    type: OrderType;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    requires_verification: boolean;
    pay_at: 'counter';
    expires_in_minutes: number;
    items: { name: string; variant: string | null; quantity: number; line_total_cents: number; modifiers: { name: string; price_delta_cents: number }[] }[];
};

export type Step = 'pairing' | 'welcome' | 'type' | 'menu' | 'cart' | 'upsell' | 'done';
