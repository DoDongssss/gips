import { ArrowRight, Loader2, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import CategoryRail from '@/kiosk/components/category-rail';
import ProductCard from '@/kiosk/components/product-card';
import { peso, typeLabel } from '@/kiosk/format';
import { cartCents, cartCount } from '@/kiosk/pricing';
import CartDrawer from '@/kiosk/screens/cart-panel';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BackButton, Frame, Pill, tintAt, tintStyle } from '@/kiosk/screens/ui';
import { useKiosk } from '@/kiosk/store';
import type { Product } from '@/kiosk/types';
import { cn } from '@/lib/utils';

/**
 * Landscape: categories on the left, products on the right. Portrait: categories as a row on top, products below.
 * The order stays out of the way: a bar at the bottom opens it as a drawer ("Review order").
 */
export default function MenuScreen({ openCart = false }: { openCart?: boolean }) {
    const menu = useKiosk((s) => s.menu);
    const lines = useKiosk((s) => s.lines);
    const orderType = useKiosk((s) => s.orderType);
    const addLine = useKiosk((s) => s.addLine);
    const goto = useKiosk((s) => s.goto);

    const categories = useMemo(() => menu.filter((c) => c.products.some((p) => p.is_available)), [menu]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [query, setQuery] = useState('');
    const [cartOpen, setCartOpen] = useState(openCart);

    // Keep a valid tab selected, also when the menu refreshes and a category disappears.
    useEffect(() => {
        if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) setCategoryId(categories[0].id);
    }, [categories, categoryId]);

    const q = query.trim().toLowerCase();
    const categoryIndex = Math.max(
        0,
        categories.findIndex((c) => c.id === categoryId),
    );
    const current = categories[categoryIndex];
    const items = useMemo(
        () => (q ? categories.flatMap((c) => c.products).filter((p) => p.is_available && p.name.toLowerCase().includes(q)) : (current?.products.filter((p) => p.is_available) ?? [])),
        [q, categories, current],
    );
    const count = cartCount(lines);

    // How many of each product are already in the order (shown as a badge on its card).
    const inCart = useMemo(() => {
        const map = new Map<number, number>();
        lines.forEach((l) => map.set(l.product.id, (map.get(l.product.id) ?? 0) + l.quantity));

        return map;
    }, [lines]);

    return (
        <Frame className="bg-secondary relative">
            <header className="flex items-center gap-4 px-8 pt-6 pb-3 portrait:pt-8">
                <BackButton onClick={() => goto('type')} />

                <label className="bg-card flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full px-5 shadow-md ring-2 ring-transparent transition-shadow focus-within:ring-[var(--accent-blue)] portrait:h-16">
                    <Search className="text-muted-foreground size-6 shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search the menu"
                        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xl outline-none select-text"
                    />
                    {query && (
                        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                            <X className="size-5" />
                        </button>
                    )}
                </label>

                {orderType && <Pill>{typeLabel(orderType)}</Pill>}
            </header>

            {categories.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 text-xl">
                    <Loader2 className="size-10 animate-spin" />
                    The menu is loading…
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 portrait:flex-col landscape:flex-row">
                    <CategoryRail
                        categories={categories}
                        selectedId={q ? null : categoryId}
                        onSelect={(id) => {
                            setCategoryId(id);
                            setQuery('');
                        }}
                    />

                    <section className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto px-8 landscape:pl-2', count > 0 ? 'pb-36' : 'pb-8')}>
                        <div className="mb-5 flex items-center gap-3">
                            <h2 className="min-w-0 truncate text-4xl font-semibold tracking-tight portrait:text-5xl">{q ? `Results for “${query.trim()}”` : current?.name}</h2>
                            <span className="rounded-full px-4 py-1.5 text-base font-medium whitespace-nowrap" style={tintStyle(tintAt(q ? 0 : categoryIndex))}>
                                {items.length} items
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <p className="text-muted-foreground py-16 text-center text-xl">Nothing found. Try another word.</p>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] gap-5 portrait:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] portrait:gap-6">
                                {items.map((p) => (
                                    <ProductCard key={p.id} product={p} quantity={inCart.get(p.id) ?? 0} onPick={setProduct} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Order bar: appears once something is in the order, opens the drawer */}
            {count > 0 && (
                <div className="animate-in slide-in-from-bottom-6 absolute inset-x-8 bottom-8 z-20 duration-300">
                    <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        className="bg-primary text-primary-foreground flex w-full items-center gap-5 rounded-3xl p-3 pl-5 text-left shadow-xl transition-transform active:scale-[0.98]"
                    >
                        <span className="bg-primary-foreground/15 relative flex size-14 items-center justify-center rounded-2xl">
                            <ShoppingBag className="size-7" />
                            <span className="bg-warning text-warning-foreground absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full text-sm font-bold">{count}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="text-primary-foreground/70 block text-sm">Your order</span>
                            <span className="block text-3xl leading-tight font-semibold tabular-nums">{peso(cartCents(lines))}</span>
                        </span>
                        <span className="bg-background text-foreground flex items-center gap-2 rounded-2xl px-6 py-4 text-xl font-semibold">
                            Review order
                            <ArrowRight className="size-6" />
                        </span>
                    </button>
                </div>
            )}

            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
            <ItemDialog product={product} onClose={() => setProduct(null)} onAdd={addLine} />
        </Frame>
    );
}
