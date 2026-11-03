// Shapes returned by the report endpoints. Money is integer centavos.

export type PaymentBreakdownRow = {
    code: string;
    name: string;
    type: string;
    count: number;
    amount_cents: number;
    refunds_cents: number;
    net_cents: number;
};

export type ReportSummary = {
    from: string;
    to: string;
    orders_count: number;
    gross_sales_cents: number;
    discounts_cents: number;
    refunds_cents: number;
    net_sales_cents: number;
    tax_cents: number;
    tips_cents: number;
    voids_count: number;
    voids_cents: number;
    payments: PaymentBreakdownRow[];
};

export type CashBreakdown = {
    opening_cents: number;
    cash_sales_cents: number;
    cash_tips_cents: number;
    cash_in_cents: number;
    cash_out_cents: number;
    cash_refunds_cents: number;
    expected_cents: number;
};

export type XReport = {
    scope: 'shift' | 'day';
    business_date: string;
    generated_at: string;
    generated_by: string;
    cashier: string | null;
    summary: ReportSummary;
    cash: CashBreakdown | null;
};

export type ZReportRecord = {
    id: number;
    report_number: string;
    business_date: string;
    generated_by: string | null;
    generated_at: string;
    orders_count: number;
    gross_sales_cents: number;
    discounts_cents: number;
    refunds_cents: number;
    net_sales_cents: number;
    tax_cents: number;
    opening_cash_cents: number;
    expected_cash_cents: number;
    counted_cash_cents: number;
    variance_cents: number;
    payments_breakdown: PaymentBreakdownRow[];
    snapshot: {
        business: { name: string | null; address: string | null; tin: string | null };
        tips_cents: number;
        voids_count: number;
        voids_cents: number;
        unpaid_orders: number;
        shifts: {
            cashier: string;
            opened_at: string;
            closed_at: string | null;
            opening_cash_cents: number;
            expected_cash_cents: number | null;
            counted_cash_cents: number | null;
            variance_cents: number | null;
        }[];
    };
};

export type ReportColumn = { key: string; label: string; type: 'text' | 'int' | 'money'; sum: boolean };

export type ReportTable = {
    type: string;
    title: string;
    columns: ReportColumn[];
    rows: Record<string, string | number>[];
    totals: Record<string, string | number> | null;
};
