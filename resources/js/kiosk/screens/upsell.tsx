import { useState } from 'react';

import { pesoShort } from '@/kiosk/format';
import { useKiosk } from '@/kiosk/store';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BigButton, Frame, Thumb, TopBar } from '@/kiosk/screens/ui';
import type { Product } from '@/kiosk/types';

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
        <Frame>
            <TopBar title="Would you like to add something?" onBack={() => goto('cart')} />

            <div className="grid flex-1 auto-rows-min content-start gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map(({ product: p, message }) => {
                    const done = added.includes(p.id);
                    const from = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price_cents)) : p.base_price_cents;

                    return (
                        <div key={p.id} className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm">
                            <Thumb src={p.image_url} name={p.name} className="aspect-[4/3] w-full" />
                            <div className="flex flex-1 flex-col gap-2 p-4">
                                <p className="text-2xl font-semibold">{p.name}</p>
                                {message && <p className="text-muted-foreground">{message}</p>}
                                <p className="text-primary text-xl font-bold">{pesoShort(from)}</p>
                                <BigButton variant={done ? 'outline' : 'primary'} className="mt-auto w-full" onClick={() => setProduct(p)}>
                                    {done ? '✓ Added. Add another' : 'Add to order'}
                                </BigButton>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="border-t p-5">
                <BigButton disabled={placing} onClick={() => void place()} className="w-full">
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
