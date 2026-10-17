import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Can } from '@/components/can';
import { Field, FormError } from '@/components/inventory/field';
import { Pager } from '@/components/inventory/pager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { index, show, store } from '@/routes/inventory/counts';
import type { Paginated } from '@/types/menu';
import type { CountRow } from '@/types/inventory';

type Props = { counts: Paginated<CountRow>; open_count_id: number | null };

const formatWhen = (value: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function CountsIndex({ counts, open_count_id }: Props) {
    const [starting, setStarting] = useState(false);
    const form = useForm({ notes: '' });
    const errors = form.errors as Record<string, string>;

    function start(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ notes: data.notes.trim() || null }));
        form.post(store.url());
    }

    return (
        <>
            <Head title="Stock counts" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Stock counts</h1>
                        <p className="text-muted-foreground text-sm">Count the shelves; differences are posted to the stock history.</p>
                    </div>
                    <Can permission="inventory.count">
                        {open_count_id ? (
                            <Button asChild>
                                <Link href={show.url(open_count_id)}>Continue count #{open_count_id}</Link>
                            </Button>
                        ) : (
                            <Button onClick={() => setStarting(true)}>Start a count</Button>
                        )}
                    </Can>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Count</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Started</th>
                                <th className="p-3 font-medium">Finished</th>
                                <th className="p-3 font-medium">By</th>
                                <th className="p-3 text-right font-medium">Ingredients</th>
                                <th className="w-24 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {counts.data.map((count) => (
                                <tr key={count.id} className="border-b last:border-0">
                                    <td className="p-3 font-medium">#{count.id}</td>
                                    <td className="p-3">
                                        <Badge variant={count.status === 'completed' ? 'default' : 'secondary'}>{count.status === 'completed' ? 'Completed' : 'In progress'}</Badge>
                                    </td>
                                    <td className="text-muted-foreground p-3" suppressHydrationWarning>
                                        {formatWhen(count.started_at)}
                                    </td>
                                    <td className="text-muted-foreground p-3" suppressHydrationWarning>
                                        {formatWhen(count.completed_at)}
                                    </td>
                                    <td className="p-3">{count.started_by ?? '—'}</td>
                                    <td className="p-3 text-right tabular-nums">{count.items_count}</td>
                                    <td className="p-3 text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={show.url(count.id)}>{count.status === 'completed' ? 'View' : 'Open'}</Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {counts.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground p-8 text-center">
                                        No counts yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pager currentPage={counts.current_page} lastPage={counts.last_page} prevUrl={counts.prev_page_url} nextUrl={counts.next_page_url} />
            </div>

            <Dialog open={starting} onOpenChange={setStarting}>
                <DialogContent>
                    <form onSubmit={start} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Start a stock count</DialogTitle>
                            <DialogDescription>
                                Takes a snapshot of what the system thinks is on hand for every active ingredient. Sales rung up while you count are not lost.
                            </DialogDescription>
                        </DialogHeader>
                        <FormError message={errors.error} />
                        <Field id="count-notes" label="Note (optional)" error={errors.notes}>
                            <Input id="count-notes" placeholder="e.g. Month-end count" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStarting(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Starting…' : 'Start count'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

CountsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Counts', href: index() },
    ],
};
