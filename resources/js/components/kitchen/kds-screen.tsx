import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { KdsTicket } from '@/components/kitchen/kds-ticket';
import type { KdsOrder } from '@/components/kitchen/kds-ticket';

const PAGE_SIZE = 8;

type Props = {
    title: string;
    /** Back / sign-out button, shown top-left. */
    leading?: ReactNode;
    orders: KdsOrder[];
    onDone: (order: KdsOrder) => void;
    onPrint?: (order: KdsOrder) => void;
    onRecall?: () => void;
};

/** Presentational board: header bar, searchable ticket grid, paging. Data fetching stays in the caller. */
export function KdsScreen({ title, leading, orders, onDone, onPrint, onRecall }: Props) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter(
            (o) =>
                String(o.number).includes(q) ||
                o.items.some((i) => i.name.toLowerCase().includes(q)) ||
                (o.server ?? '').toLowerCase().includes(q),
        );
    }, [orders, query]);

    const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const current = Math.min(page, pages - 1);
    const slice = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

    return (
        <div className="flex h-dvh flex-col bg-slate-200 text-gray-900">
            <header className="flex items-center gap-3 px-4 py-3">
                {leading}
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold">{title}</h1>
                    <p className="text-sm text-gray-600">
                        {orders.length} open {orders.length === 1 ? 'order' : 'orders'}
                    </p>
                </div>

                <label className="relative mx-auto hidden w-full max-w-md md:block">
                    <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-500" />
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Search by number, item or server"
                        className="h-12 w-full rounded-full bg-white pr-4 pl-11 text-base shadow-inner outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </label>

                {onRecall && (
                    <button
                        type="button"
                        onClick={onRecall}
                        className="ml-auto flex h-12 items-center gap-2 rounded-md bg-slate-900 px-5 text-lg font-semibold text-white active:bg-slate-700"
                    >
                        <History className="size-5" />
                        Recall
                    </button>
                )}
            </header>

            <main className="relative min-h-0 flex-1 px-4">
                {slice.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xl text-gray-500">
                        {query ? 'No orders match your search.' : 'No open orders. New orders appear here.'}
                    </div>
                ) : (
                    <div className="grid h-full grid-cols-2 auto-rows-fr gap-3 xl:grid-cols-4">
                        {slice.map((order) => (
                            <KdsTicket key={order.id} order={order} onDone={onDone} onPrint={onPrint} />
                        ))}
                    </div>
                )}
            </main>

            <footer className="flex items-center justify-center gap-4 px-4 py-2">
                <button
                    type="button"
                    aria-label="Previous page"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                    className="flex size-12 items-center justify-center rounded-full bg-white shadow disabled:opacity-40"
                >
                    <ChevronLeft className="size-6" />
                </button>
                <span className="min-w-20 text-center text-base font-medium tabular-nums">
                    {current + 1} / {pages}
                </span>
                <button
                    type="button"
                    aria-label="Next page"
                    disabled={current >= pages - 1}
                    onClick={() => setPage(current + 1)}
                    className="flex size-12 items-center justify-center rounded-full bg-white shadow disabled:opacity-40"
                >
                    <ChevronRight className="size-6" />
                </button>
            </footer>
        </div>
    );
}