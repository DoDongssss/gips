/** Money arrives in centavos. */
export function peso(cents: number | null | undefined, withDecimals = true): string {
    const value = (cents ?? 0) / 100;

    return `₱${value.toLocaleString(undefined, {
        minimumFractionDigits: withDecimals ? 2 : 0,
        maximumFractionDigits: withDecimals ? 2 : 0,
    })}`;
}

/** Axis labels: ₱1.2k, ₱3.4M. */
export function pesoCompact(cents: number): string {
    const v = cents / 100;
    const abs = Math.abs(v);

    if (abs >= 1_000_000) return `₱${trim(v / 1_000_000)}M`;
    if (abs >= 1_000) return `₱${trim(v / 1_000)}k`;

    return `₱${Math.round(v)}`;
}

function trim(n: number): string {
    return n.toFixed(1).replace(/\.0$/, '');
}

export function int(n: number): string {
    return n.toLocaleString();
}

/** Change against the previous period. null when there is nothing to compare with. */
export function delta(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;

    return (current - previous) / previous;
}

export function percent(n: number, digits = 0): string {
    return `${(n * 100).toFixed(digits)}%`;
}

export function timeOf(iso: string | null | undefined): string {
    if (!iso) return '—';

    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "5 min ago", "2 h ago", "3 d ago". */
export function ago(iso: string | null | undefined, now = Date.now()): string {
    if (!iso) return '—';

    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;

    return `${Math.floor(minutes / 1440)} d ago`;
}

/** "dine_in" -> "Dine in", "gcash" stays readable. */
export function words(value: string): string {
    const text = value.replace(/_/g, ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(date = new Date()): string {
    const h = date.getHours();

    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
