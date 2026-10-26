import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { peso } from '@/kiosk/format';
import { neededFrom, unitCents } from '@/kiosk/pricing';
import { BigButton, SectionHeading, Stepper, Thumb, successText } from '@/kiosk/screens/ui';
import type { Modifier, ModifierGroup, Product, Variant } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = { product: Product | null; onClose: () => void; onAdd: (product: Product, variant: Variant | null, modifiers: Modifier[], quantity: number) => void };

const available = (group: ModifierGroup): Modifier[] => group.modifiers.filter((m) => m.is_available);

/**
 * Size, add-ons and quantity for one product. "Add" stays off until every required choice is made.
 * Landscape: picture and price on the left, choices on the right. Portrait: stacked.
 */
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
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 duration-200 landscape:items-center landscape:p-8" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={product.name}
                onClick={(e) => e.stopPropagation()}
                className="bg-background animate-in slide-in-from-bottom-8 relative flex max-h-[94%] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl duration-300 landscape:h-full landscape:max-h-[44rem] landscape:max-w-6xl landscape:flex-row landscape:rounded-3xl"
            >
                <button type="button" onClick={onClose} aria-label="Close" className="bg-card text-foreground absolute top-4 right-4 z-10 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90">
                    <X className="size-6" />
                </button>

                {/* Picture, name and price */}
                <div className="relative h-60 shrink-0 landscape:h-auto landscape:w-[40%]">
                    <Thumb src={product.image_url} name={product.name} className="absolute inset-0 size-full text-8xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 space-y-2 p-6 text-white">
                        <h2 className="text-4xl leading-tight font-semibold tracking-tight">{product.name}</h2>
                        {product.description && <p className="line-clamp-3 text-lg text-white/85">{product.description}</p>}
                        <p className="text-3xl font-semibold tabular-nums">{peso(unit)}</p>
                    </div>
                </div>

                {/* Choices */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="flex-1 space-y-8 overflow-y-auto p-6 landscape:p-8">
                        {product.variants.length > 0 && (
                            <section>
                                <SectionHeading title="Size" />
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
                                    {product.variants.map((v) => (
                                        <Choice key={v.id} selected={v.id === variantId} onClick={() => setVariantId(v.id)} label={v.name} detail={peso(v.price_cents)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {groups.map((group) => {
                            const need = neededFrom(group);
                            const count = (picked[group.id] ?? []).length;
                            const unmet = count < need;

                            return (
                                <section key={group.id}>
                                    <SectionHeading
                                        title={group.name}
                                        badge={
                                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium', unmet ? 'bg-destructive/10 text-destructive' : need > 0 ? cn('bg-success/15', successText) : 'bg-muted text-muted-foreground')}>
                                                {!unmet && need > 0 && <Check className="size-4" strokeWidth={3} />}
                                                {need > 0 ? 'Required' : 'Optional'}
                                                {group.selection_type === 'multiple' && group.max_select !== null ? ` · up to ${group.max_select}` : ''}
                                            </span>
                                        }
                                    />
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
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

                    <div className="bg-card flex items-center gap-4 border-t p-5">
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
        </div>
    );
}

function Choice({ selected, onClick, label, detail, square = false }: { selected: boolean; onClick: () => void; label: string; detail: string; square?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cn('flex min-h-[4.5rem] items-center gap-4 rounded-2xl border-2 px-5 text-left transition-all duration-150 active:scale-[0.98]', selected ? 'border-primary bg-primary/5' : 'border-border bg-card')}
        >
            <span className={cn('flex size-8 shrink-0 items-center justify-center border-2 transition-colors', square ? 'rounded-lg' : 'rounded-full', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                {selected && <Check className="size-5" strokeWidth={3} />}
            </span>
            <span className="flex-1 text-xl font-medium">{label}</span>
            {detail && <span className="text-lg font-semibold tabular-nums">{detail}</span>}
        </button>
    );
}
