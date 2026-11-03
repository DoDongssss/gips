import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { formatPeso } from '@/lib/money';

/** Philippine bills and coins, in centavos. */
const BILLS = [100000, 50000, 20000, 10000, 5000, 2000];
const COINS = [2000, 1000, 500, 100, 25];

type Props = {
    /** Called with the counted total in centavos every time a count changes. */
    onChange: (totalCents: number) => void;
    /** Changes when the counter should start again from zero (for example when a dialog opens). */
    resetKey?: unknown;
};

/** Cash counter: type how many of each bill and coin, and the total adds itself up. */
export function DenominationCounter({ onChange, resetKey }: Props) {
    const [counts, setCounts] = useState<Record<string, string>>({});

    useEffect(() => {
        setCounts({});
    }, [resetKey]);

    const total = [...BILLS.map((d) => `b${d}`), ...COINS.map((d) => `c${d}`)].reduce((sum, key) => {
        const cents = Number(key.slice(1));

        return sum + cents * (parseInt(counts[key] ?? '', 10) || 0);
    }, 0);

    useEffect(() => {
        onChange(total);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    function field(prefix: 'b' | 'c', cents: number) {
        const key = `${prefix}${cents}`;

        return (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground w-20 tabular-nums">{formatPeso(cents)}</span>
                <Input
                    inputMode="numeric"
                    className="h-9 w-20 text-right tabular-nums"
                    placeholder="0"
                    value={counts[key] ?? ''}
                    onChange={(event) => setCounts((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, '').slice(0, 5) }))}
                />
            </label>
        );
    }

    return (
        <div className="space-y-3">
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide uppercase">Bills</p>
                    {BILLS.map((cents) => field('b', cents))}
                </div>
                <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide uppercase">Coins</p>
                    {COINS.map((cents) => field('c', cents))}
                </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-base font-semibold">
                <span>Total counted</span>
                <span className="tabular-nums">{formatPeso(total)}</span>
            </div>
        </div>
    );
}
