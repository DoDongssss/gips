import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPeso } from '@/lib/money';
import type { PosDiscount } from '@/pages/orders/types';
import type { CartDiscount, CartLine } from '@/stores/cart-store';

type Props = {
    open: boolean;
    discounts: PosDiscount[];
    lines: CartLine[];
    onClose: () => void;
    onAdd: (discount: Omit<CartDiscount, 'uid'>) => void;
};

export const describeDiscount = (discount: PosDiscount): string =>
    discount.type === 'percent' ? `${discount.value / 100}% off` : `${formatPeso(discount.value)} off`;

export function DiscountDialog({ open, discounts, lines, onClose, onAdd }: Props) {
    const [discountId, setDiscountId] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [lineUid, setLineUid] = useState('');

    useEffect(() => {
        if (open) {
            setDiscountId('');
            setIdNumber('');
            setLineUid('');
        }
    }, [open]);

    const discount = discounts.find((d) => String(d.id) === discountId) ?? null;
    const needsLine = discount?.applies_to === 'item';
    const ready = discount !== null && (!discount.requires_id || idNumber.trim() !== '') && (!needsLine || lineUid !== '');

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!discount || !ready) {
            return;
        }

        onAdd({
            discount_id: discount.id,
            name: discount.name,
            requires_approval: discount.requires_approval,
            id_number: idNumber.trim(),
            line_uid: needsLine ? lineUid : null,
        });
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="gap-3 rounded-2xl border-0 bg-white p-5 shadow-2xl sm:max-w-sm">
                <form onSubmit={submit} className="space-y-3">
                    <DialogHeader>
                        <DialogTitle>Add discount</DialogTitle>
                        <DialogDescription>The amount is worked out by the server and shown in the cart.</DialogDescription>
                    </DialogHeader>

                    {discounts.length === 0 ? (
                        <p className="text-muted-foreground text-base">No discounts are available right now.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="discount-pick">Discount</Label>
                                <Select value={discountId} onValueChange={setDiscountId}>
                                    <SelectTrigger id="discount-pick">
                                        <SelectValue placeholder="Choose a discount" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {discounts.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>
                                                {d.name} · {describeDiscount(d)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {discount?.is_vat_exempt && (
                                    <p className="text-muted-foreground text-sm">VAT exempt. Only one VAT-exempt discount can be used per order.</p>
                                )}
                            </div>

                            {discount?.requires_id && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="discount-id">Customer ID number</Label>
                                    <Input id="discount-id" value={idNumber} maxLength={50} onChange={(e) => setIdNumber(e.target.value)} autoFocus />
                                </div>
                            )}

                            {needsLine && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="discount-line">Apply to item</Label>
                                    <Select value={lineUid} onValueChange={setLineUid}>
                                        <SelectTrigger id="discount-line">
                                            <SelectValue placeholder="Choose an item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lines.map((line) => (
                                                <SelectItem key={line.uid} value={line.uid}>
                                                    {line.quantity} × {line.name}
                                                    {line.variant_name ? ` (${line.variant_name})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {discount?.requires_approval && (
                                <p className="text-muted-foreground text-sm">A manager&apos;s approval is needed before the order can be placed.</p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!ready}>
                            Add discount
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
