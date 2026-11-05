export function peso(cents: number): string {
    return `₱${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Whole pesos when there are no centavos: ₱95 instead of ₱95.00. Used on menu tiles. */
export function pesoShort(cents: number): string {
    return cents % 100 === 0 ? `₱${(cents / 100).toLocaleString()}` : peso(cents);
}

export const typeLabel = (type: string): string => (type === 'dine_in' ? 'Dine in' : 'Takeout');
