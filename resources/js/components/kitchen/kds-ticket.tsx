import { Printer, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

export type KdsItem = {
    id: number | string;
    qty: number;
    name: string;
    modifiers?: string[];
    note?: string | null;
    voided?: boolean;
};

export type KdsOrderType = 'dine_in' | 'delivery' | 'togo' | 'pickup';

export type KdsOrder = {
    id: number | string;
    number: string | number;
    type: KdsOrderType;
    table?: string | null;
    server?: string | null;
    createdAt: string | number | Date;
    items: KdsItem[];
    voided?: boolean;
    voidReason?: string | null;
};

const TYPES: Record<KdsOrderType, { label: string; header: string }> = {
    dine_in: { label: 'Dine in', header: 'bg-green-700' },
    delivery: { label: 'Delivery', header: 'bg-orange-600' },
    togo: { label: 'To go', header: 'bg-sky-700' },
    pickup: { label: 'Pick up', header: 'bg-violet-700' },
};

/** Red is reserved for "needs attention": voids and late tickets. */
const LATE_AFTER = 10 * 60;
const VERY_LATE_AFTER = 15 * 60;

function useElapsed(createdAt: KdsOrder['createdAt']) {
    const start = new Date(createdAt).getTime();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return Math.max(0, Math.floor((now - start) / 1000));
}

function format(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

type Props = {
    order: KdsOrder;
    onDone: (order: KdsOrder) => void;
    onPrint?: (order: KdsOrder) => void;
};

export function KdsTicket({ order, onDone, onPrint }: Props) {
    const elapsed = useElapsed(order.createdAt);
    const type = TYPES[order.type];
    const late = !order.voided && elapsed >= LATE_AFTER;
    const veryLate = !order.voided && elapsed >= VERY_LATE_AFTER;

    return (
        <article
            className={`flex min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md ring-2 ${
                veryLate ? 'ring-red-600' : late ? 'ring-amber-500' : 'ring-transparent'
            }`}
        >
            <header className={`flex items-start justify-between gap-2 px-3 py-2 text-white ${type.header}`}>
                <div className="min-w-0">
                    <h2 className="text-xl leading-tight font-bold">{type.label}</h2>
                    <p className="truncate text-sm opacity-90">
                        {[order.table, order.server].filter(Boolean).join(' · ') || 'No server'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg leading-tight font-bold tabular-nums">#{order.number}</p>
                    <p
                        className={`mt-0.5 inline-block rounded px-1.5 text-sm font-semibold tabular-nums ${
                            veryLate ? 'bg-red-600' : late ? 'bg-amber-500 text-black' : 'bg-black/25'
                        }`}
                    >
                        {format(elapsed)}
                    </p>
                </div>
            </header>

            {order.voided && (
                <div className="bg-red-600 px-3 py-1.5 text-center text-sm font-semibold text-white">
                    Order voided{order.voidReason ? `: ${order.voidReason}` : ''}
                </div>
            )}

            <ul className="min-h-0 flex-1 divide-y divide-gray-200 overflow-y-auto">
                {order.items.map((item) => {
                    const struck = order.voided || item.voided;
                    return (
                        <li key={item.id} className="px-3 py-2">
                            <p
                                className={`flex gap-2 text-lg leading-snug font-semibold ${
                                    struck ? 'text-gray-400 line-through decoration-red-600 decoration-2' : ''
                                }`}
                            >
                                <span className="w-6 shrink-0 text-right tabular-nums">{item.qty}</span>
                                <span>{item.name}</span>
                            </p>
                            {item.voided && !order.voided && (
                                <p className="ml-8 text-sm font-semibold text-red-600">Voided</p>
                            )}
                            {item.modifiers?.map((mod) => (
                                <p
                                    key={mod}
                                    className={`ml-8 text-base ${
                                        struck ? 'text-gray-400 line-through' : 'font-medium text-red-600'
                                    }`}
                                >
                                    {mod}
                                </p>
                            ))}
                            {item.note && !struck && (
                                <p className="mt-1 ml-8 rounded bg-yellow-100 px-2 py-0.5 text-sm text-yellow-900">
                                    {item.note}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>

            <footer className="grid grid-cols-[1fr_auto] gap-2 border-t border-gray-200 bg-gray-50 p-2">
                <button
                    type="button"
                    onClick={() => onDone(order)}
                    className="flex h-14 items-center justify-center gap-2 rounded-md bg-slate-900 text-lg font-semibold text-white active:bg-slate-700"
                >
                    <Check className="size-5" />
                    {order.voided ? 'Clear' : 'Done'}
                </button>
                {onPrint && (
                    <button
                        type="button"
                        onClick={() => onPrint(order)}
                        aria-label={`Print order ${order.number}`}
                        className="flex h-14 w-16 items-center justify-center rounded-md bg-white text-slate-900 ring-1 ring-gray-300 active:bg-gray-100"
                    >
                        <Printer className="size-6" />
                    </button>
                )}
            </footer>
        </article>
    );
}