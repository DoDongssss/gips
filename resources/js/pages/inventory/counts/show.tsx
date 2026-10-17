import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import { Can } from '@/components/can';
import { FormError } from '@/components/inventory/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatChange, formatQty } from '@/lib/inventory';
import { complete, index, update } from '@/routes/inventory/counts';
import type { CountItem } from '@/types/inventory';

type Props = {
    count: { id: number; status: 'draft' | 'in_progress' | 'completed'; notes: string | null; started_at: string | null; completed_at: string | null };
    // Optional on the server: undefined until requested.
    items?: CountItem[];
    errors?: Record<string, string>;
};

const ONLY = ['count', 'items'];

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export default function CountShow({ count, items }: Props) {
    const open = count.status !== 'completed';

    const [values, setValues] = useState<Record<number, string>>({});
    const [search, setSearch] = useState('');
    const [uncountedOnly, setUncountedOnly] = useState(false);
    const [showExpected, setShowExpected] = useState(!open);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The lines load on their own so the page opens fast.
    useEffect(() => {
        if (!items) {
            router.reload({ only: ONLY });
        } else {
            setValues(Object.fromEntries(items.map((item) => [item.ingredient_id, item.counted_quantity === null ? '' : String(Number(item.counted_quantity))])));
        }
    }, [items]);

    const rows = items ?? [];

    // Lines the person typed into since the last save.
    const dirty = useMemo(() => {
        const changes: Record<number, string | null> = {};

        for (const item of rows) {
            const typed = (values[item.ingredient_id] ?? '').trim();
            const saved = item.counted_quantity === null ? '' : String(Number(item.counted_quantity));

            if (typed !== saved) {
                changes[item.ingredient_id] = typed === '' ? null : typed;
            }
        }

        return changes;
    }, [rows, values]);

    const dirtyCount = Object.keys(dirty).length;

    const varianceOf = (item: CountItem): number | null => {
        const typed = (values[item.ingredient_id] ?? '').trim();

        return typed === '' || Number.isNaN(Number(typed)) ? null : round4(Number(typed) - Number(item.expected_quantity));
    };

    const counted = rows.filter((item) => (values[item.ingredient_id] ?? '').trim() !== '').length;
    const withVariance = rows.filter((item) => {
        const v = varianceOf(item);

        return v !== null && v !== 0;
    });

    const visible = rows.filter((item) => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
            return false;
        }

        return !uncountedOnly || (values[item.ingredient_id] ?? '').trim() === '';
    });

    function persist(then?: () => void) {
        if (dirtyCount === 0) {
            then?.();

            return;
        }

        setBusy(true);
        router.put(
            update.url(count.id),
            { counted: dirty },
            {
                only: ONLY,
                preserveScroll: true,
                onSuccess: () => then?.(),
                onError: (errors) => setError(Object.values(errors)[0] ?? 'The counts could not be saved.'),
                onFinish: () => setBusy(false),
            },
        );
    }

    function finish() {
        setError(null);
        persist(() => {
            setBusy(true);
            router.post(
                complete.url(count.id),
                {},
                {
                    onSuccess: () => setConfirming(false),
                    onError: (errors) => {
                        setConfirming(false);
                        setError(Object.values(errors)[0] ?? 'The count could not be completed.');
                    },
                    onFinish: () => setBusy(false),
                },
            );
        });
    }

    return (
        <>
            <Head title={`Stock count #${count.id}`} />

            <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">Stock count #{count.id}</h1>
                            <Badge variant={open ? 'secondary' : 'default'}>{open ? 'In progress' : 'Completed'}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {open ? 'Enter what is physically on the shelf, in the unit shown. Leave a line blank to skip it.' : 'Differences were posted to the stock history.'}
                            {count.notes && ` · ${count.notes}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={index.url()}>All counts</Link>
                        </Button>
                        {open && (
                            <Can permission="inventory.count">
                                <Button variant="outline" disabled={busy || dirtyCount === 0} onClick={() => persist()}>
                                    {busy ? 'Saving…' : dirtyCount > 0 ? `Save progress (${dirtyCount})` : 'Saved'}
                                </Button>
                                <Button disabled={busy || counted === 0} onClick={() => setConfirming(true)}>
                                    Finish count
                                </Button>
                            </Can>
                        )}
                    </div>
                </div>

                <FormError message={error ?? undefined} />

                <div className="flex flex-wrap items-center gap-3">
                    <Input className="h-11 max-w-xs" placeholder="Find an ingredient" aria-label="Find an ingredient" value={search} onChange={(e) => setSearch(e.target.value)} />
                    {open && (
                        <>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="size-4" checked={uncountedOnly} onChange={(e) => setUncountedOnly(e.target.checked)} />
                                Not counted yet
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="size-4" checked={showExpected} onChange={(e) => setShowExpected(e.target.checked)} />
                                Show system count
                            </label>
                        </>
                    )}
                    <span className="text-muted-foreground ml-auto text-sm">
                        {counted} of {rows.length} counted
                    </span>
                </div>

                {!items ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">Loading ingredients…</p>
                ) : (
                    <div className="divide-y rounded-lg border">
                        {visible.map((item) => {
                            const variance = varianceOf(item);

                            return (
                                <div key={item.ingredient_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                                    <div className="min-w-48 flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        {(showExpected || !open) && (
                                            <p className="text-muted-foreground text-xs">
                                                System: {formatQty(item.expected_quantity)} {item.unit}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Input
                                            className="h-12 w-36 text-right text-lg tabular-nums"
                                            inputMode="decimal"
                                            aria-label={`Counted ${item.name}`}
                                            placeholder="—"
                                            disabled={!open}
                                            value={values[item.ingredient_id] ?? ''}
                                            onChange={(e) => setValues((current) => ({ ...current, [item.ingredient_id]: e.target.value }))}
                                        />
                                        <span className="text-muted-foreground w-10 text-sm">{item.unit}</span>
                                    </div>

                                    <div className="w-28 text-right text-sm tabular-nums">
                                        {variance === null ? (
                                            <span className="text-muted-foreground">—</span>
                                        ) : variance === 0 ? (
                                            <span className="text-green-700">Matches</span>
                                        ) : (
                                            <span className={variance < 0 ? 'font-medium text-red-600' : 'font-medium text-amber-700'}>
                                                {formatChange(variance)} {item.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {visible.length === 0 && <p className="text-muted-foreground p-8 text-center text-sm">Nothing to show.</p>}
                    </div>
                )}
            </div>

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finish this count?</DialogTitle>
                        <DialogDescription>
                            {counted} of {rows.length} ingredients counted. Ingredients left blank are not changed. Differences are posted to the stock history and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {withVariance.length === 0 ? (
                        <p className="text-sm">Everything counted matches the system.</p>
                    ) : (
                        <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
                            <p className="font-medium">{withVariance.length} difference(s) will be posted:</p>
                            {withVariance.map((item) => (
                                <div key={item.ingredient_id} className="flex justify-between gap-3">
                                    <span>{item.name}</span>
                                    <span className="tabular-nums">
                                        {formatChange(varianceOf(item) ?? 0)} {item.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirming(false)}>
                            Keep counting
                        </Button>
                        <Button disabled={busy} onClick={finish}>
                            {busy ? 'Posting…' : 'Post and finish'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

CountShow.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Counts', href: index() },
        { title: 'Count', href: index() },
    ],
};

