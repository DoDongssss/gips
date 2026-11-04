import { Check, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { pesoShort } from '@/kiosk/format';
import { useKiosk } from '@/kiosk/store';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BigButton, Frame, Thumb, TopBar, successText } from '@/kiosk/screens/ui';
import type { Product, Suggestion } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Pick = { product: Product; suggestion: Suggestion };

/** "Add a pastry?" One last chance before the order is placed. Skipping is always one tap. */
export default function UpsellScreen() {
    const suggestions = useKiosk((s) => s.suggestions);
    const menu = useKiosk((s) => s.menu);
    const placing = useKiosk((s) => s.placing);
    const { addLine, goto, place } = useKiosk.getState();

    const [pick, setPick] = useState<Pick | null>(null);
    const [added, setAdded] = useState<number[]>([]);

    const products = new Map(menu.flatMap((c) => c.products).map((p) => [p.id, p]));
    const cards = suggestions.flatMap((s) => {
        const p = s.product ?? products.get(s.product_id);

        return p ? [{ product: p, suggestion: s }] : [];
    });

    return (
        <Frame className="bg-secondary">
            <TopBar title="Would you like to add something?" onBack={() => goto('cart')} />

            <div className="flex-1 overflow-y-auto p-4">
                <p className="text-muted-foreground mb-4 flex items-center gap-2.5 text-lg">
                    <span className="bg-warning/20 text-warning-foreground flex size-8 items-center justify-center rounded-md">
                        <Sparkles className="size-4" />
                    </span>
                    Goes well with your order. Totally optional.
                </p>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
                    {cards.map(({ product: p, suggestion: s }) => {
                        const done = added.includes(p.id);
                        const menuFrom = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price_cents)) : p.base_price_cents;
                        const from = s.upsell_price_cents ?? menuFrom;

                        return (
                            <div key={s.rule_id} className={cn('bg-card flex flex-col overflow-hidden rounded-xl shadow-sm ring-2 transition-colors', done ? 'ring-success' : 'ring-border ring-1')}>
                                <Thumb src={p.image_url} name={p.name} className="aspect-[4/3] w-full" />
                                <div className="flex flex-1 flex-col gap-2.5 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xl leading-snug font-semibold">{p.name}</p>
                                        <div className="text-right">
                                            <p className="pt-0.5 text-xl font-semibold tabular-nums">{pesoShort(from)}</p>
                                            {s.upsell_price_cents !== null && s.upsell_price_cents < menuFrom && (
                                                <p className="text-muted-foreground text-sm line-through tabular-nums">{pesoShort(menuFrom)}</p>
                                            )}
                                        </div>
                                    </div>
                                    {s.message && <p className="bg-warning/15 rounded-lg px-3 py-2 text-sm">{s.message}</p>}
                                    <BigButton
                                        variant={done ? 'tonal' : 'primary'}
                                        className={cn('mt-auto w-full', done && cn('bg-success/15', successText))}
                                        onClick={() => setPick({ product: p, suggestion: s })}
                                    >
                                        {done ? <Check className="size-5" strokeWidth={3} /> : <Plus className="size-5" />}
                                        {done ? 'Added. Add another' : 'Add to order'}
                                    </BigButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-card border-t p-3">
                <BigButton variant="success" disabled={placing} onClick={() => void place()} className="w-full text-xl">
                    {placing ? 'Placing your order…' : added.length > 0 ? 'Place order' : 'No thanks, place my order'}
                </BigButton>
            </div>

            <ItemDialog
                product={pick?.product ?? null}
                promoUnitCents={pick?.suggestion.upsell_price_cents ?? null}
                onClose={() => setPick(null)}
                onAdd={(p, variant, modifiers, quantity, notes) => {
                    const s = pick?.suggestion;
                    if (!s) {
                        return;
                    }

                    addLine(p, variant, modifiers, quantity, notes, { ruleId: s.rule_id, unitPriceCents: s.upsell_price_cents });
                    setAdded((now) => (now.includes(p.id) ? now : [...now, p.id]));
                }}
            />
        </Frame>
    );
}
