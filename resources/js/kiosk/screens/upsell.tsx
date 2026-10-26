import { Check, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { pesoShort } from '@/kiosk/format';
import { useKiosk } from '@/kiosk/store';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BigButton, Frame, Thumb, TopBar, successText } from '@/kiosk/screens/ui';
import type { Product } from '@/kiosk/types';
import { cn } from '@/lib/utils';

/** "Add a pastry?" One last chance before the order is placed. Skipping is always one tap. */
export default function UpsellScreen() {
    const suggestions = useKiosk((s) => s.suggestions);
    const menu = useKiosk((s) => s.menu);
    const placing = useKiosk((s) => s.placing);
    const { addLine, goto, place } = useKiosk.getState();

    const [product, setProduct] = useState<Product | null>(null);
    const [added, setAdded] = useState<number[]>([]);

    const products = new Map(menu.flatMap((c) => c.products).map((p) => [p.id, p]));
    const cards = suggestions.flatMap((s) => {
        const p = products.get(s.product_id);

        return p ? [{ product: p, message: s.message }] : [];
    });

    return (
        <Frame className="bg-secondary">
            <TopBar title="Would you like to add something?" onBack={() => goto('cart')} />

            <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
                <p className="text-muted-foreground mb-6 flex items-center gap-3 text-2xl">
                    <span className="bg-warning/20 text-warning-foreground flex size-10 items-center justify-center rounded-full">
                        <Sparkles className="size-5" />
                    </span>
                    Goes well with your order. Totally optional.
                </p>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-6">
                    {cards.map(({ product: p, message }) => {
                        const done = added.includes(p.id);
                        const from = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price_cents)) : p.base_price_cents;

                        return (
                            <div key={p.id} className={cn('bg-card flex flex-col overflow-hidden rounded-2xl shadow-sm ring-2 transition-colors', done ? 'ring-success' : 'ring-transparent')}>
                                <Thumb src={p.image_url} name={p.name} className="aspect-[4/3] w-full" />
                                <div className="flex flex-1 flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-2xl leading-snug font-semibold">{p.name}</p>
                                        <p className="pt-0.5 text-2xl font-semibold tabular-nums">{pesoShort(from)}</p>
                                    </div>
                                    {message && <p className="bg-warning/15 rounded-xl px-4 py-2.5 text-base">{message}</p>}
                                    <BigButton variant={done ? 'tonal' : 'primary'} className={cn('mt-auto w-full', done && cn('bg-success/15', successText))} onClick={() => setProduct(p)}>
                                        {done ? <Check className="size-6" strokeWidth={3} /> : <Plus className="size-6" />}
                                        {done ? 'Added. Add another' : 'Add to order'}
                                    </BigButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-card rounded-t-3xl p-6 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)]">
                <BigButton variant="success" disabled={placing} onClick={() => void place()} className="w-full text-2xl">
                    {placing ? 'Placing your order…' : added.length > 0 ? 'Place order' : 'No thanks, place my order'}
                </BigButton>
            </div>

            <ItemDialog
                product={product}
                onClose={() => setProduct(null)}
                onAdd={(p, variant, modifiers, quantity) => {
                    addLine(p, variant, modifiers, quantity);
                    setAdded((now) => (now.includes(p.id) ? now : [...now, p.id]));
                }}
            />
        </Frame>
    );
}
