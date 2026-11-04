import type { CashBreakdown } from '@/lib/reports';

export type ShiftMovement = {
    id: number;
    type: 'cash_in' | 'cash_out' | 'drop' | 'payout';
    label: string;
    amount_cents: number;
    reason: string;
    by: string | null;
    at: string | null;
};

export type ShiftRecord = {
    id: number;
    cashier: string | null;
    cashier_id?: number;
    status: 'open' | 'closed';
    business_date: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash_cents: number;
    expected_cash_cents: number | null;
    counted_cash_cents: number | null;
    variance_cents: number | null;
    notes: string | null;
    device_id?: number | null;
    cash: CashBreakdown | null;
    close_preview_cents?: number | null;
    is_mine?: boolean;
    movements: ShiftMovement[];
};

export type ShiftFilters = {
    search: string;
    from: string;
    to: string;
    user: string;
    variance: string;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};
