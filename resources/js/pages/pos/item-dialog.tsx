import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDelta, formatPeso } from '@/lib/money';
import type { MenuGroup, MenuProduct } from '@/pages/pos/types';
import type { CartLine } from '@/stores/cart-store';

type Props = {
    product: MenuProduct | null;
    /** Set when editing a line already in the cart. */
    line?: CartLine | null;
    onClose: () => void;
    onSave: (line: Omit<CartLine, 'uid'>) => void;
};

/** The same limits the server enforces, so the cashier hears about them before pressing Add. */
function limits(group: MenuGroup): { min: number; max: number | null } {
    return {
        min: group.is_required ? Math.max(group.min_select, 1) : group.min_select,
        max: group.selection_type === 'single' ? 1 : group.max_select,
    };
}

function rule(group: MenuGroup): string {
    const { min, max } = limits(group);

    if (max === 1) {
        return min >= 1 ? 'Choose 1' : 'Choose up to 1';
    }

    if (min > 0 && max !== null) {
        return min === max ? `Choose ${min}` : `Choose ${min}–${max}`;
    }

    if (min > 0) {
        return `Choose at least ${min}`;
    }

    return max !== null ? `Choose up to ${max}` : 'Optional';
}

const defaultVariantId = (product: MenuProduct): number | null =>
    (product.variants.find((v) => v.is_default) ?? product.variants[0])?.id ?? null;

export function ItemDialog({ product, line, onClose, onSave }: Props) {
    const [variantId, setVariantId] = useState<number | null>(null);
    const [picked, setPicked] = useState<number[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    // Start from the cart line when editing, otherwise from the product's defaults.
    useEffect(() => {
        if (!product) {
            return;
        }

        setVariantId(line?.variant_id ?? defaultVariantId(product));
        setPicked(line?.modifier_ids ?? []);
        setQuantity(line?.quantity ?? 1);
        setNotes(line?.notes ?? '');
    }, [product, line]);

    const variant = product?.variants.find((v) => v.id === variantId) ?? null;

    const problems = useMemo(() => {
        if (!product) {
            return [];
        }

        return product.groups.flatMap((group) => {
            const { min, max } = limits(group);
            const count = group.modifiers.filter((m) => picked.includes(m.id)).length;

            if (count < min) {
                return [`${group.name}: choose at least ${min}.`];
            }

            return max !== null && count > max ? [`${group.name}: choose at most ${max}.`] : [];
        });
    }, [product, picked]);

    if (!product) {
        return null;
    }

    const allModifiers = product.groups.flatMap((g) => g.modifiers);
    const modifierTotal = allModifiers.filter((m) => picked.includes(m.id)).reduce((sum, m) => sum + m.price_delta_cents, 0);
    const unit = (variant ? variant.price_cents : product.base_price_cents) + modifierTotal;

    function toggle(group: MenuGroup, modifierId: number) {
        const { min, max } = limits(group);
        const inGroup = group.modifiers.map((m) => m.id);
        const isOn = picked.includes(modifierId);

        if (max === 1) {
            // Single choice: picking another replaces it; tapping the same one clears it unless required.
            if (isOn) {
                if (min < 1) {
                    setPicked((current) => current.filter((id) => id !== modifierId));
                }

                return;
            }

            setPicked((current) => [...current.filter((id) => !inGroup.includes(id)), modifierId]);

            return;
        }

        if (isOn) {
            setPicked((current) => current.filter((id) => id !== modifierId));
        } else if (max === null || picked.filter((id) => inGroup.includes(id)).length < max) {
            setPicked((current) => [...current, modifierId]);
        }
    }

    function save() {
        if (!product) {
            return;
        }

        const chosen = allModifiers.filter((m) => picked.includes(m.id));

        onSave({
            product_id: product.id,
            name: product.name,
            image_url: product.image_url,
            variant_id: variant?.id ?? null,
            variant_name: variant?.name ?? null,
            modifier_ids: chosen.map((m) => m.id),
            modifier_names: chosen.map((m) => m.name),
            notes: notes.trim(),
            quantity,
        });
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto rounded-2xl border-0 bg-white p-5 shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>{product.description ?? 'Choose size and add-ons.'}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {product.variants.length > 0 && (
                        <fieldset className="space-y-1.5">
                            <legend className="text-base font-medium">Size</legend>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                {product.variants.map((v) => (
                                    <Button
                                        key={v.id}
                                        type="button"
                                        variant={v.id === variantId ? 'default' : 'outline'}
                                        className="h-auto flex-col gap-0 py-1.5"
                                        aria-pressed={v.id === variantId}
                                        onClick={() => setVariantId(v.id)}
                                    >
                                        <span>{v.name}</span>
                                        <span className="text-sm opacity-80">{formatPeso(v.price_cents)}</span>
                                    </Button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {product.groups.map((group) => (
                        <fieldset key={group.id} className="space-y-1.5">
                            <legend className="flex w-full items-baseline justify-between text-base font-medium">
                                <span>{group.name}</span>
                                <span className="text-muted-foreground text-sm font-normal">
                                    {rule(group)}
                                    {group.is_required && ' · required'}
                                </span>
                            </legend>
                            <div className="grid grid-cols-2 gap-1.5">
                                {group.modifiers.map((modifier) => {
                                    const on = picked.includes(modifier.id);

                                    return (
                                        <Button
                                            key={modifier.id}
                                            type="button"
                                            variant={on ? 'default' : 'outline'}
                                            className="h-11 justify-between py-1.5"
                                            aria-pressed={on}
                                            disabled={!modifier.is_available}
                                            onClick={() => toggle(group, modifier.id)}
                                        >
                                            <span>{modifier.name}</span>
                                            <span className="text-sm opacity-80">
                                                {modifier.is_available
                                                    ? modifier.price_delta_cents !== 0
                                                        ? formatDelta(modifier.price_delta_cents)
                                                        : ''
                                                    : 'Sold out'}
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}

                    <div className="space-y-1.5">
                        <Label htmlFor="item-notes">Note for the kitchen (optional)</Label>
                        <Textarea id="item-notes" rows={2} maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="item-qty">Quantity</Label>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                                −
                            </Button>
                            <Input
                                id="item-qty"
                                className="h-10 w-16 text-center"
                                inputMode="numeric"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.min(99, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))}
                            />
                            <Button type="button" variant="outline" size="icon" className="size-10" aria-label="More" onClick={() => setQuantity((q) => Math.min(99, q + 1))}>
                                +
                            </Button>
                        </div>
                    </div>

                    {problems.length > 0 && (
                        <ul className="text-destructive space-y-1 text-base">
                            {problems.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={problems.length > 0} onClick={save}>
                        {line ? 'Update' : 'Add'} · {formatPeso(unit * quantity)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
