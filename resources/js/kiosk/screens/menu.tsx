import { ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { peso, pesoShort, typeLabel } from '@/kiosk/format';
import { cartCents, cartCount } from '@/kiosk/pricing';
import { useKiosk } from '@/kiosk/store';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BigButton, Frame, Thumb, TopBar } from '@/kiosk/screens/ui';
import type { Product } from '@/kiosk/types';
import { cn } from '@/lib/utils';

/** Left: categories. Centre: products. Bottom: the cart bar once something is in it. */
export default function MenuScreen() {
    const menu = useKiosk((s) => s.menu);
    const lines = useKiosk((s) => s.lines);
    const orderType = useKiosk((s) => s.orderType);
    const addLine = useKiosk((s) => s.addLine);
    const goto = useKiosk((s) => s.goto);

    const categories = useMemo(() => menu.filter((c) => c.products.some((p) => p.is_available)), [menu]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [product, setProduct] = useState<Product | null>(null);

    // Keep a valid tab selected, also when the menu refreshes and a category disappears.
    useEffect(() => {
        if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) setCategoryId(categories[0].id);
    }, [categories, categoryId]);

    const current = categories.find((c) => c.id === categoryId);
    const count = cartCount(lines);

    return (
        <Frame>
            <TopBar title="Choose your items" onBack={() => goto('type')} right={orderType && <span className="bg-muted rounded-full px-4 py-2 text-lg font-medium">{typeLabel(orderType)}</span>} />

            {categories.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 items-center justify-center text-xl">The menu is loading…</div>
            ) : (
                <div className="flex min-h-0 flex-1">
                    <nav className="w-52 shrink-0 space-y-2 overflow-y-auto border-r p-3" aria-label="Categories">
                        {categories.map((c) => (
                            <button key={c.id} type="button" onClick={() => setCategoryId(c.id)} className={cn('w-full rounded-2xl px-4 py-4 text-left text-xl font-semibold transition-colors', c.id === categoryId ? 'bg-primary text-primary-foreground' : 'bg-muted/60')}>
                                {c.name}
                            </button>
                        ))}
                    </nav>

                    <div className="grid flex-1 auto-rows-min grid-cols-2 content-start gap-4 overflow-y-auto p-4 xl:grid-cols-3">
                        {current?.products
                            .filter((p) => p.is_available)
                            .map((p) => {
                                const from = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price_cents)) : p.base_price_cents;

                                return (
                                    <button key={p.id} type="button" onClick={() => setProduct(p)} className="bg-card border-border flex flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition-transform active:scale-[0.98]">
                                        <Thumb src={p.image_url} name={p.name} className="aspect-[4/3] w-full" />
                                        <div className="space-y-1 p-3">
                                            <p className="line-clamp-2 text-xl leading-snug font-semibold">{p.name}</p>
                                            <p className="text-primary text-lg font-bold">
                                                {p.variants.length > 1 && <span className="text-muted-foreground mr-1 text-sm font-normal">from</span>}
                                                {pesoShort(from)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}

            {count > 0 && (
                <div className="bg-background flex items-center gap-4 border-t p-4">
                    <div className="flex items-center gap-3">
                        <span className="bg-primary text-primary-foreground relative flex size-14 items-center justify-center rounded-full">
                            <ShoppingCart className="size-7" />
                            <span className="bg-foreground text-background absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full text-sm font-bold">{count}</span>
                        </span>
                        <div>
                            <p className="text-muted-foreground text-sm">Your order</p>
                            <p className="text-2xl font-bold tabular-nums">{peso(cartCents(lines))}</p>
                        </div>
                    </div>
                    <BigButton onClick={() => goto('cart')} className="ml-auto min-w-64">
                        Review order
                    </BigButton>
                </div>
            )}

            <ItemDialog product={product} onClose={() => setProduct(null)} onAdd={addLine} />
        </Frame>
    );
}
