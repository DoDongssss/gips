import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPeso } from '@/lib/money';
import { loadEditableOrder, saveOrderLines } from '@/lib/order-edit';
import { errorList } from '@/lib/pos-http';

/** Remove items or change quantities on an unpaid order. Saving prices the order again on the server. */
export function EditOrderDialog({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [quantities, setQuantities] = useState<Record<number, number>>({});

    const { data, isPending, isError } = useQuery({
        queryKey: ['pos', 'order-lines', orderId],
        queryFn: () => loadEditableOrder(orderId as number),
        enabled: orderId !== null,
        gcTime: 0,
    });

    useEffect(() => {
        if (data) setQuantities(Object.fromEntries(data.lines.map((line) => [line.id, line.quantity])));
    }, [data]);

    const save = useMutation({
        mutationFn: () =>
            saveOrderLines(
                orderId as number,
                Object.entries(quantities).map(([id, quantity]) => ({ id: Number(id), quantity })),
            ),
        onSuccess: (order) => {
            toast.success(`${order.order_number} updated. New total ${formatPeso(order.total_cents)}.`);
            void queryClient.invalidateQueries({ queryKey: ['pos'] });
            onClose();
        },
        onError: (error) => errorList(error).forEach((message) => toast.error(message)),
    });

    const lines = (data?.lines ?? []).filter((line) => quantities[line.id] !== undefined);
    const changed = data !== undefined && (lines.length !== data.lines.length || lines.some((line) => quantities[line.id] !== line.quantity));
    const estimate = lines.reduce((sum, line) => sum + line.unit_cents * (quantities[line.id] ?? 0), 0);

    const setQuantity = (id: number, quantity: number) => setQuantities((now) => ({ ...now, [id]: Math.min(99, Math.max(1, quantity)) }));
    const remove = (id: number) =>
        setQuantities((now) => {
            const { [id]: _removed, ...rest } = now;

            return rest;
        });

    return (
        <Dialog open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit order {data?.order_number}</DialogTitle>
                    <DialogDescription>Remove items or change quantities before the customer pays.</DialogDescription>
                </DialogHeader>

                {isPending && <p className="text-muted-foreground py-6 text-center">Loading…</p>}
                {isError && <p className="text-destructive py-6 text-center">This order could not be loaded.</p>}
                {data && !data.editable && <p className="text-destructive py-4 text-center">This order can no longer be changed.</p>}

                {data?.editable && (
                    <div className="max-h-[50vh] divide-y overflow-y-auto">
                        {lines.map((line) => (
                            <div key={line.id} className="flex items-center gap-2 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-medium">
                                        {line.name}
                                        {line.variant && <span className="text-muted-foreground font-normal"> · {line.variant}</span>}
                                    </p>
                                    {line.modifiers.length > 0 && <p className="text-muted-foreground truncate text-sm">{line.modifiers.join(', ')}</p>}
                                    <p className="text-muted-foreground text-sm tabular-nums">{formatPeso(line.unit_cents)} each</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline" className="size-10" aria-label="Less" onClick={() => setQuantity(line.id, (quantities[line.id] ?? 1) - 1)}>
                                        <Minus className="size-4" />
                                    </Button>
                                    <span className="w-8 text-center text-base font-semibold tabular-nums">{quantities[line.id]}</span>
                                    <Button size="icon" variant="outline" className="size-10" aria-label="More" onClick={() => setQuantity(line.id, (quantities[line.id] ?? 1) + 1)}>
                                        <Plus className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-destructive size-10" aria-label={`Remove ${line.name}`} disabled={lines.length === 1} onClick={() => remove(line.id)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {data?.editable && (
                    <>
                        <div className="flex items-baseline justify-between border-t pt-3">
                            <span className="text-muted-foreground text-sm">{changed ? 'Items total (tax and discounts are applied when saved)' : 'Order total'}</span>
                            <span className="text-lg font-semibold tabular-nums">{formatPeso(changed ? estimate : data.total_cents)}</span>
                        </div>
                        {lines.length === 1 && <p className="text-muted-foreground text-xs">To remove the last item, cancel the order instead.</p>}
                    </>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button disabled={!changed || save.isPending || !data?.editable} onClick={() => save.mutate()}>
                        {save.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
