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
    status: 'open' | 'closed';
    business_date: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash_cents: number;
    /** Hidden from a cashier until the shift is closed, so the count is honest. */
    expected_cash_cents: number | null;
    counted_cash_cents: number | null;
    variance_cents: number | null;
    notes: string | null;
    cash: CashBreakdown | null;
    movements: ShiftMovement[];
};
