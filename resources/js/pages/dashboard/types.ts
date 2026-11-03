export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month';

export type Range = {
    key: RangeKey;
    label: string;
    days: number;
    from: string;
    to: string;
    options: { key: RangeKey; label: string }[];
};

export type Access = { sales: boolean; live: boolean; shifts: boolean; inventory: boolean; purchasing: boolean; kiosk: boolean };

export type Summary = {
    orders: number;
    gross_cents: number;
    net_cents: number;
    discount_cents: number;
    tax_cents: number;
    tip_cents: number;
    refund_cents: number;
    refund_count: number;
    items: number;
    avg_order_cents: number;
    voided: number;
    cancelled: number;
};

export type TrendPoint = { label: string; cents: number; orders: number; prev_cents: number };
export type Money = { name: string; cents: number };
export type Split = { key: string; count: number; cents: number };
export type ProductRow = { id: number; name: string; qty: number; cents: number };

export type Sales = {
    summary: Summary;
    previous: Summary;
    trend: { unit: 'hour' | 'day'; points: TrendPoint[] };
    hours: { hour: number; label: string; orders: number }[];
    payments: { name: string; type: string; count: number; cents: number }[];
    channels: Split[];
    types: Split[];
    products: { by_quantity: ProductRow[]; by_revenue: ProductRow[] };
    categories: { name: string; qty: number; cents: number }[];
    staff: { name: string; orders: number; cents: number }[];
};

export type RecentOrder = {
    id: number;
    number: string;
    channel: string;
    type: string;
    status: string;
    payment_status: string;
    total_cents: number;
    customer: string | null;
    cashier: string | null;
    items: number;
    at: string | null;
};

export type Live = {
    as_of: string;
    pipeline: { open: number; confirmed: number; preparing: number; ready: number };
    unpaid: { count: number; due_cents: number };
    kitchen: { tickets: number; oldest_minutes: number | null; stations: { name: string; count: number }[] };
    recent: RecentOrder[];
};

export type OpenShift = {
    id: number;
    cashier: string;
    opened_at: string;
    opening_cents: number;
    cash_sales_cents: number;
    cash_in_cents: number;
    cash_out_cents: number;
    expected_cents: number;
};

export type Shifts = {
    open: OpenShift[];
    closed_today: { id: number; cashier: string; closed_at: string; variance_cents: number | null }[];
};

export type InventoryStats = {
    low: { count: number; items: { id: number; name: string; unit: string | null; quantity: string; reorder_level: string; is_negative: boolean }[] };
    stock_value_cents: number;
    negative_count: number;
    empty_count: number;
    cogs_cents: number;
    waste_cents: number;
    count_in_progress: boolean;
};

export type Purchasing = {
    draft: number;
    sent: number;
    partial: number;
    open_cents: number;
    overdue: number;
    due: { id: number; po_number: string; status: string; supplier: string; expected_at: string; total_cents: number; overdue: boolean; href: string }[];
};

export type Kiosk = {
    /** true while the phase 7 tables do not exist: the numbers are placeholders. */
    demo: boolean;
    devices: { id: number; name: string; app_version: string | null; last_seen_at: string | null; online: boolean; out_of_service: boolean }[];
    sessions: { total: number; completed: number; abandoned: number; rate: number };
};

export type Alert = { level: 'danger' | 'warning' | 'info'; text: string; href?: string };

export type DashboardProps = {
    range: Range;
    access: Access;
    live: Live | null;
    shifts: Shifts | null;
    sales: Sales | null;
    inventory: InventoryStats | null;
    purchasing: Purchasing | null;
    kiosk: Kiosk | null;
    alerts: Alert[];
};
