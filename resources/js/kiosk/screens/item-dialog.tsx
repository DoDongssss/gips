import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { peso } from '@/kiosk/format';
import { neededFrom, unitCents } from '@/kiosk/pricing';
import { BigButton, Stepper, Thumb } from '@/kiosk/screens/ui';
import type { Modifier, ModifierGroup, Product, Variant } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = { product: Product | null; onClose: () => void; onAdd: (product: Product, variant: Variant | null, modifiers: Modifier[], quantity: number) => void };

const available = (group: ModifierGroup): Modifier[] => group.modifiers.filter((m) => m.is_available);

/** Size, add-ons and quantity for one product. "Add" stays off until every required choice is made. */
export default function ItemDialog({ product, onClose, onAdd }: Props) {
    const [variantId, setVariantId] = useState<number | null>(null);
    const [picked, setPicked] = useState<Record<number, number[]>>({});
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (!product) return;

        const variant = product.variants.find((v) => v.is_default) ?? product.variants[0] ?? null;
        setVariantId(variant?.id ?? null);
        setQuantity(1);
        setPicked(Object.fromEntries(product.modifier_groups.map((g) => [g.id, available(g).filter((m) => m.is_default).map((m) => m.id)])));
    }, [product]);

    const groups = useMemo(() => (product ? product.modifier_groups.filter((g) => available(g).length > 0) : []), [product]);

    if (!product) return null;

    const variant = product.variants.find((v) => v.id === variantId) ?? null;
    const chosen: Modifier[] = groups.flatMap((g) => available(g).filter((m) => (picked[g.id] ?? []).includes(m.id)));
    const missing = groups.find((g) => (picked[g.id] ?? []).length < neededFrom(g));
    const unit = unitCents(product, variant, chosen);

    function toggle(group: ModifierGroup, modifier: Modifier) {
        setPicked((current) => {
            const now = current[group.id] ?? [];
            const has = now.includes(modifier.id);

            if (group.selection_type === 'single') {
                // Pick one; tapping it again clears it only when the group is optional.
                return { ...current, [group.id]: has ? (neededFrom(group) > 0 ? now : []) : [modifier.id] };
            }

            if (has) return { ...current, [group.id]: now.filter((id) => id !== modifier.id) };
            if (group.max_select !== null && now.length >= group.max_select) return current;

            return { ...current, [group.id]: [...now, modifier.id] };
        });
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()} className="bg-background flex max-h-[92%] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl">
                <div className="flex items-center gap-4 border-b p-5">
                    <Thumb src={product.image_url} name={product.name} className="size-20 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-3xl font-bold">{product.name}</h2>
                        {product.description && <p className="text-muted-foreground line-clamp-2">{product.description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="bg-muted flex size-12 items-center justify-center rounded-full">
                        <X className="size-6" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                    {product.variants.length > 0 && (
                        <section>
                            <h3 className="mb-3 text-xl font-semibold">Size</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {product.variants.map((v) => (
                                    <Choice key={v.id} selected={v.id === variantId} onClick={() => setVariantId(v.id)} label={v.name} detail={peso(v.price_cents)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {groups.map((group) => {
                        const need = neededFrom(group);
                        const count = (picked[group.id] ?? []).length;

                        return (
                            <section key={group.id}>
                                <div className="mb-3 flex items-baseline justify-between gap-3">
                                    <h3 className="text-xl font-semibold">{group.name}</h3>
                                    <p className={cn('text-sm', count < need ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                        {need > 0 ? 'Required' : 'Optional'}
                                        {group.selection_type === 'multiple' && group.max_select !== null ? ` · up to ${group.max_select}` : ''}
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {available(group).map((m) => (
                                        <Choice
                                            key={m.id}
                                            selected={(picked[group.id] ?? []).includes(m.id)}
                                            onClick={() => toggle(group, m)}
                                            label={m.name}
                                            detail={m.price_delta_cents === 0 ? '' : `${m.price_delta_cents > 0 ? '+' : '−'}${peso(Math.abs(m.price_delta_cents))}`}
                                            square={group.selection_type === 'multiple'}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4 border-t p-5">
                    <Stepper value={quantity} onChange={setQuantity} />
                    <BigButton
                        disabled={missing !== undefined}
                        onClick={() => {
                            onAdd(product, variant, chosen, quantity);
                            onClose();
                        }}
                        className="flex-1"
                    >
                        {missing ? `Choose ${missing.name.toLowerCase()}` : `Add to order · ${peso(unit * quantity)}`}
                    </BigButton>
                </div>
            </div>
        </div>
    );
}

function Choice({ selected, onClick, label, detail, square = false }: { selected: boolean; onClick: () => void; label: string; detail: string; square?: boolean }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={selected} className={cn('flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 text-left transition-colors active:scale-[0.98]', selected ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
            <span className={cn('flex size-7 shrink-0 items-center justify-center border-2 text-sm font-bold', square ? 'rounded-md' : 'rounded-full', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{selected ? '✓' : ''}</span>
            <span className="flex-1 text-lg font-medium">{label}</span>
            {detail && <span className="text-muted-foreground tabular-nums">{detail}</span>}
        </button>
    );
}
