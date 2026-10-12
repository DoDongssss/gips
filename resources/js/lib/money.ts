/** Money is integer centavos everywhere except inside form inputs (pesos as text). */
export const formatPeso = (cents: number): string =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

/** "125.50" -> 12550. Invalid or empty input becomes 0. */
export const pesosToCents = (value: string | number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** 12550 -> "125.50" for an input's value. */
export const centsToPesos = (cents: number): string => (cents / 100).toFixed(2);

/** "+₱30.00" / "-₱5.00" / "Free" for modifier price changes. */
export const formatDelta = (cents: number): string =>
    cents === 0 ? 'No charge' : `${cents > 0 ? '+' : '-'}${formatPeso(Math.abs(cents))}`;
