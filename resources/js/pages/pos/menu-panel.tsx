import { ImageIcon, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { formatPeso } from '@/lib/money';
import type { MenuCategory, MenuProduct } from '@/pages/pos/types';
import { useCartStore } from '@/stores/cart-store';

type Props = {
    categories: MenuCategory[];
    onPick: (product: MenuProduct) => void;
};

const priceLabel = (product: MenuProduct): string => {
    if (product.variants.length === 0) {
        return formatPeso(product.base_price_cents);
    }

    return `From ${formatPeso(Math.min(...product.variants.map((v) => v.price_cents)))}`;
};

export function MenuPanel({ categories, onPick }: Props) {
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    const lines = useCartStore((state) => state.lines);
    const inCart = useMemo(() => {
        const counts: Record<number, number> = {};

        lines.forEach((line) => {
            counts[line.product_id] = (counts[line.product_id] ?? 0) + line.quantity;
        });

        return counts;
    }, [lines]);

    const products = useMemo(() => {
        const term = search.trim().toLowerCase();

        return categories
            .filter((category) => categoryId === null || category.id === categoryId)
            .flatMap((category) => category.products.map((product) => ({ product, category: category.name })))
            .filter(({ product }) => term === '' || product.name.toLowerCase().includes(term));
    }, [categories, categoryId, search]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Search */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100/50 px-3 py-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400" />
                    <Input
                        className="h-11 rounded-lg border-gray-300 bg-white pr-10 pl-10 text-base shadow-sm focus-visible:border-blue-500"
                        placeholder="Search items"
                        aria-label="Search items"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            onClick={() => setSearch('')}
                        >
                            <X className="size-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className="border-b border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Categories">
                    {[{ id: null, name: 'All' }, ...categories].map((category) => (
                        <button
                            key={category.id ?? 'all'}
                            type="button"
                            role="tab"
                            aria-selected={categoryId === category.id}
                            className={`h-10 shrink-0 rounded-lg px-4 text-base font-medium transition-colors ${
                                categoryId === category.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setCategoryId(category.id)}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {products.length === 0 ? (
                    <p className="py-16 text-center text-base text-gray-500">Nothing matches your search.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2 p-2 lg:grid-cols-5">
                        {products.map(({ product, category }) => (
                            <button
                                key={product.id}
                                type="button"
                                disabled={!product.is_available}
                                onClick={() => onPick(product)}
                                className={`group relative flex flex-col overflow-hidden rounded-xl bg-white text-left shadow-sm transition-all duration-200 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                                    inCart[product.id] > 0 ? 'ring-2 ring-blue-300' : 'ring-1 ring-gray-200 hover:ring-gray-300'
                                }`}
                            >
                                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <span className="flex size-14 items-center justify-center rounded-full bg-gray-100">
                                                <ImageIcon className="size-7 text-gray-400" strokeWidth={1.5} />
                                            </span>
                                        </div>
                                    )}

                                    {categoryId === null && (
                                        <span className="absolute top-1.5 left-1.5 max-w-[70%] truncate rounded-md bg-white/95 px-1.5 py-1 text-sm font-medium text-blue-700 shadow-sm">
                                            {category}
                                        </span>
                                    )}

                                    {inCart[product.id] > 0 && (
                                        <span className="absolute top-1.5 right-1.5 min-w-7 rounded-md bg-blue-600 px-1.5 py-1 text-center text-sm font-semibold text-white tabular-nums shadow-sm">
                                            {inCart[product.id]}
                                        </span>
                                    )}

                                    <span className="absolute right-1.5 bottom-1.5 rounded-md bg-white/95 px-2 py-1 text-sm font-bold text-gray-900 shadow-sm tabular-nums">
                                        {priceLabel(product)}
                                    </span>

                                    {product.is_available && (
                                        <span className="absolute bottom-1.5 left-1.5 flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm group-active:bg-blue-700">
                                            <Plus className="size-5" />
                                        </span>
                                    )}

                                    {!product.is_available && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
                                            <span className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">Sold out</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-1 items-center justify-center p-2">
                                    <h3 className="text-center text-base leading-snug font-semibold text-gray-900 [overflow-wrap:anywhere]">{product.name}</h3>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
