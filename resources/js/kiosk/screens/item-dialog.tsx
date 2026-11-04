import { Check, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { peso } from '@/kiosk/format';
import { neededFrom, unitCents } from '@/kiosk/pricing';
import { BigButton, SectionHeading, Stepper, Thumb, successText } from '@/kiosk/screens/ui';
import type { Modifier, ModifierGroup, Product, Variant } from '@/kiosk/types';
import { useDragScroll } from '@/kiosk/use-drag-scroll';
import { cn } from '@/lib/utils';

type Props = {
    product: Product | null;
    onClose: () => void;
    onAdd: (product: Product, variant: Variant | null, modifiers: Modifier[], quantity: number, notes?: string | null) => void;
};

const available = (group: ModifierGroup): Modifier[] => group.modifiers.filter((m) => m.is_available);

/**
 * Size, add-ons and quantity for one product. "Add" stays off until every required choice is made.
 * Landscape: picture and price on the left, choices on the right. Portrait: stacked.
 */
export default function ItemDialog({ product, onClose, onAdd }: Props) {
    const [variantId, setVariantId] = useState<number | null>(null);
    const [picked, setPicked] = useState<Record<number, number[]>>({});
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const dragScroll = useDragScroll<HTMLDivElement>();

    useEffect(() => {
        if (!product) return;

        const variant = product.variants.find((v) => v.is_default) ?? product.variants[0] ?? null;
        setVariantId(variant?.id ?? null);
        setQuantity(1);
        setNotes('');
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
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 duration-200 landscape:items-center landscape:p-6" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={product.name}
                onClick={(e) => e.stopPropagation()}
                className="bg-background animate-in slide-in-from-bottom-8 relative flex max-h-[94%] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl duration-300 landscape:h-full landscape:max-h-[42rem] landscape:max-w-5xl landscape:flex-row landscape:rounded-2xl"
            >
                {/* Picture, name and price */}
                <div className="relative h-56 shrink-0 overflow-hidden landscape:h-auto landscape:w-[38%]">
                    <Thumb src={product.image_url} name={product.name} className="absolute inset-0 size-full text-8xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-4 text-white">
                        <h2 className="text-3xl leading-tight font-semibold tracking-tight">{product.name}</h2>
                        {product.description && <p className="line-clamp-2 text-base text-white/85 landscape:line-clamp-3">{product.description}</p>}
                        <p className="text-2xl font-semibold tabular-nums">{peso(unit)}</p>
                    </div>
                </div>

                {/* Choices */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
                        <p className="text-muted-foreground flex items-center gap-2 text-base">
                            <SlidersHorizontal className="size-4" />
                            Customize your order
                        </p>
                        <button type="button" onClick={onClose} aria-label="Close" className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-90">
                            <X className="size-5" />
                        </button>
                    </div>

                    <div ref={dragScroll} className="flex-1 touch-pan-y space-y-5 overflow-y-auto overscroll-contain p-4 landscape:p-5">
                        {product.variants.length > 0 && (
                            <section>
                                <SectionHeading title="Size" />
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
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
                                            <span className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium', unmet ? 'bg-destructive/10 text-destructive' : need > 0 ? cn('bg-success/15', successText) : 'bg-muted text-muted-foreground')}>
                                                {!unmet && need > 0 && <Check className="size-3.5" strokeWidth={3} />}
                                                {need > 0 ? 'Required' : 'Optional'}
                                                {group.selection_type === 'multiple' && group.max_select !== null ? ` · up to ${group.max_select}` : ''}
                                            </span>
                                        }
                                    />
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
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

                    <div className="border-t px-3 pt-3">
                        <label className="text-muted-foreground mb-2 block text-sm">Special instructions (optional)</label>
                        <input
                            type="text"
                            maxLength={255}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. less ice"
                            className="bg-secondary mb-3 w-full rounded-lg px-3 py-2 text-base outline-none"
                        />
                    </div>

                    <div className="bg-card flex items-center gap-3 border-t p-3">
                        <Stepper value={quantity} onChange={setQuantity} />
                        <BigButton
                            disabled={missing !== undefined}
                            onClick={() => {
                                onAdd(product, variant, chosen, quantity, notes.trim() || null);
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
            className={cn('flex min-h-14 items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-all duration-150 active:scale-[0.98]', selected ? 'border-primary bg-primary/5' : 'border-border bg-card')}
        >
            <span className={cn('flex size-7 shrink-0 items-center justify-center border-2 transition-colors', square ? 'rounded-md' : 'rounded-full', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                {selected && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1 text-lg leading-tight font-medium">{label}</span>
            {detail && <span className="shrink-0 text-base font-semibold whitespace-nowrap tabular-nums">{detail}</span>}
        </button>
    );
}
