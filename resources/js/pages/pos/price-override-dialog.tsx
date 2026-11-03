import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { centsToPesos, formatPeso, pesosToCents } from '@/lib/money';
import type { CartLine } from '@/stores/cart-store';

export type PriceOverride = { unit_price_cents: number; reason: string };

type Props = {
    /** The cart line being changed, or null when closed. */
    line: CartLine | null;
    /** The item's list price (before any change and before add-ons), in centavos. */
    listPriceCents: number | null;
    /** The change already on the line, if any. */
    current: PriceOverride | null;
    /** True when the cashier cannot override alone, so a manager PIN will be asked at checkout. */
    needsApproval: boolean;
    onClose: () => void;
    /** `null` clears the change and goes back to the list price. */
    onApply: (override: PriceOverride | null) => void;
};

/** Change the price of one cart line. The server decides whether it is allowed; this only collects the new price and why. */
export function PriceOverrideDialog({ line, listPriceCents, current, needsApproval, onClose, onApply }: Props) {
    const [price, setPrice] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (line) {
            setPrice(current ? centsToPesos(current.unit_price_cents) : listPriceCents !== null ? centsToPesos(listPriceCents) : '');
            setReason(current?.reason ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [line?.uid]);

    const cents = price.trim() === '' ? null : pesosToCents(price);
    const changed = cents !== null && listPriceCents !== null && cents !== listPriceCents;
    const ready = changed && reason.trim().length >= 3;

    function submit(event: FormEvent) {
        event.preventDefault();

        if (ready && cents !== null) {
            onApply({ unit_price_cents: cents, reason: reason.trim() });
        }
    }

    return (
        <Dialog open={line !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="gap-3 rounded-2xl border-0 bg-white p-5 shadow-2xl sm:max-w-sm">
                <form onSubmit={submit} className="space-y-3">
                    <DialogHeader>
                        <DialogTitle>Change price{line ? ` · ${line.name}` : ''}</DialogTitle>
                        <DialogDescription>
                            {listPriceCents !== null ? `List price ${formatPeso(listPriceCents)} each, before add-ons. ` : ''}
                            {needsApproval ? "A manager's PIN is asked at checkout." : 'You can change prices.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label htmlFor="override-price">New price each (₱)</Label>
                        <Input
                            id="override-price"
                            className="h-12 text-lg"
                            inputMode="decimal"
                            autoFocus
                            value={price}
                            onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ''))}
                        />
                        {cents !== null && listPriceCents !== null && cents !== listPriceCents && (
                            <p className={`text-sm ${cents < listPriceCents ? 'text-green-700' : 'text-amber-700'}`}>
                                {cents < listPriceCents ? '−' : '+'}
                                {formatPeso(Math.abs(cents - listPriceCents))} each
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="override-reason">Reason</Label>
                        <Textarea id="override-reason" rows={2} maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
                    </div>

                    <DialogFooter className="gap-1.5 sm:gap-1.5">
                        {current && (
                            <Button type="button" variant="ghost" className="mr-auto text-red-600 hover:text-red-700" onClick={() => onApply(null)}>
                                Use list price
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!ready}>
                            Apply
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
