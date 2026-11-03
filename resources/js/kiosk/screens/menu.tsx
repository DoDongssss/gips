import { ArrowRight, Loader2, Search, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import CategoryTabs from '@/kiosk/components/category-tabs';
import ProductCard from '@/kiosk/components/product-card';
import { peso, typeLabel } from '@/kiosk/format';
import { cartCents, cartCount } from '@/kiosk/pricing';
import CartDrawer from '@/kiosk/screens/cart-panel';
import ItemDialog from '@/kiosk/screens/item-dialog';
import { BackButton, Frame, Pill } from '@/kiosk/screens/ui';
import { useKiosk } from '@/kiosk/store';
import type { Product } from '@/kiosk/types';
import { cn } from '@/lib/utils';

/**
 * The same layout as the register menu: search on top, "All" and category tabs, then a grid of square product cards.
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

    // If the menu refreshes and the selected category disappears, fall back to "All".
    useEffect(() => {
        if (categoryId !== null && !categories.some((c) => c.id === categoryId)) setCategoryId(null);
    }, [categories, categoryId]);

    const q = query.trim().toLowerCase();
    // A search looks through every category, so no tab is picked while it is on.
    const activeCategory = q ? null : categoryId;

    const entries = useMemo(
        () =>
            categories
                .filter((c) => activeCategory === null || c.id === activeCategory)
                .flatMap((c) => c.products.filter((p) => p.is_available).map((p) => ({ product: p, category: c.name })))
                .filter(({ product: p }) => q === '' || p.name.toLowerCase().includes(q)),
        [categories, activeCategory, q],
    );

    const count = cartCount(lines);
    const caption = q ? `Results for “${query.trim()}”` : (categories.find((c) => c.id === activeCategory)?.name ?? 'Everything');

    // How many of each product are already in the order (shown as a badge on its card).
    const inCart = useMemo(() => {
        const map = new Map<number, number>();
        lines.forEach((l) => map.set(l.product.id, (map.get(l.product.id) ?? 0) + l.quantity));

        return map;
    }, [lines]);

    return (
        <Frame className="bg-secondary relative">
            {/* Search */}
            <header className="from-accent to-accent/40 flex items-center gap-2 border-b bg-gradient-to-r px-4 py-2.5">
                <BackButton onClick={() => goto('type')} />

                <label className="bg-card flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-[var(--accent-blue)] portrait:h-14">
                    <Search className="text-muted-foreground size-5 shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search the menu"
                        aria-label="Search the menu"
                        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xl outline-none select-text"
                    />
                    {query && (
                        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                            <X className="size-4" />
                        </button>
                    )}
                </label>

                {orderType && <Pill icon={orderType === 'dine_in' ? <UtensilsCrossed /> : <ShoppingBag />}>{typeLabel(orderType)}</Pill>}
            </header>

            {categories.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-xl">
                    <Loader2 className="size-9 animate-spin" />
                    The menu is loading…
                </div>
            ) : (
                <>
                    <CategoryTabs
                        categories={categories}
                        selectedId={activeCategory}
                        onSelect={(id) => {
                            setCategoryId(id);
                            setQuery('');
                        }}
                    />

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <p className="text-muted-foreground flex items-center gap-1.5 px-4 pt-3 text-sm">
                            <span className="text-foreground font-medium">{caption}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">{entries.length} items</span>
                        </p>

                        {entries.length === 0 ? (
                            <p className="text-muted-foreground py-16 text-center text-xl">Nothing found. Try another word.</p>
                        ) : (
                            <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 p-3', count > 0 && 'pb-28')}>
                                {entries.map(({ product: p, category }) => (
                                    <ProductCard key={p.id} product={p} quantity={inCart.get(p.id) ?? 0} categoryName={activeCategory === null ? category : undefined} onPick={setProduct} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Order bar: appears once something is in the order, opens the drawer */}
            {count > 0 && (
                <div className="animate-in slide-in-from-bottom-6 absolute inset-x-3 bottom-3 z-20 duration-300">
                    <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        className="bg-primary text-primary-foreground flex w-full items-center gap-3 rounded-xl p-2 pl-3 text-left shadow-xl transition-transform active:scale-[0.98]"
                    >
                        <span className="bg-primary-foreground/15 relative flex size-12 items-center justify-center rounded-lg">
                            <ShoppingBag className="size-6" />
                            <span className="bg-warning text-warning-foreground absolute -top-1.5 -right-1.5 flex min-w-6 items-center justify-center rounded-md px-1 py-0.5 text-xs font-bold tabular-nums">{count}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="text-primary-foreground/70 block text-xs">Your order</span>
                            <span className="block text-2xl leading-tight font-semibold tabular-nums">{peso(cartCents(lines))}</span>
                        </span>
                        <span className="bg-background text-foreground flex items-center gap-2 rounded-lg px-5 py-3.5 text-lg font-semibold">
                            Review order
                            <ArrowRight className="size-5" />
                        </span>
                    </button>
                </div>
            )}

            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
            <ItemDialog product={product} onClose={() => setProduct(null)} onAdd={addLine} />
        </Frame>
    );
}
