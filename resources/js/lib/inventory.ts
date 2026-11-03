import type { PoStatus } from '@/types/inventory';

/** "12.5000" -> "12.5", "1500.0000" -> "1,500". Stock quantities carry four decimals; show only what matters. */
export function formatQty(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** A signed change with an explicit plus: "+1,500" / "-180". */
export function formatChange(value: string | number): string {
    const n = Number(value);

    return `${n > 0 ? '+' : ''}${formatQty(n)}`;
}

/**
 * Cost per base unit arrives in (fractional) centavos, e.g. "1.2000" for beans per gram.
 * Shown in pesos with enough decimals to read: 0.012.
 */
export function formatUnitCost(centsPerUnit: string | number | null | undefined, unit?: string | null): string {
    if (centsPerUnit === null || centsPerUnit === undefined || centsPerUnit === '') {
        return '—';
    }

    const pesos = Number(centsPerUnit) / 100;
    const text = pesos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

    return `₱${text}${unit ? ` / ${unit}` : ''}`;
}

export const movementLabels: Record<string, string> = {
    purchase: 'Delivery',
    sale: 'Sale',
    adjustment: 'Adjustment',
    waste: 'Waste',
    count: 'Count',
    return: 'Return',
};

export const wasteReasonLabels: Record<string, string> = {
    spoilage: 'Spoilage',
    spill: 'Spill',
    expired: 'Expired',
    mistake: 'Mistake',
    other: 'Other',
};

export const poStatusLabels: Record<PoStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    partial: 'Partly received',
    received: 'Received',
    cancelled: 'Cancelled',
};

/** Where a ledger row came from, for the movement history. */
export function referenceLabel(type: string | null, id: number | null): string {
    if (!type || id === null) {
        return '—';
    }

    const name = type.split('\\').pop() ?? type;
    const readable: Record<string, string> = { Order: 'Order', order: 'Order', GoodsReceipt: 'Receipt', goods_receipt: 'Receipt', StockCount: 'Count', stock_count: 'Count', WasteLog: 'Waste log', waste_log: 'Waste log' };

    return `${readable[name] ?? name} #${id}`;
}

/** Page query: drops empty values so the URL stays clean. */
export function cleanQuery<T extends Record<string, unknown>>(params: T): Partial<T> {
    return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as Partial<T>;
}
