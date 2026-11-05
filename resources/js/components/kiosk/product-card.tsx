import { Plus } from 'lucide-react';

import { pesoShort } from '@/lib/kiosk/format';
import { Thumb } from '@/components/kiosk/ui';
import type { Product } from '@/types/kiosk';
import { cn } from '@/lib/utils';

type Props = {
    product: Product;
    /** How many of this product are already in the order. */
    quantity: number;
    /** Shown on the picture while "All" is selected, so you can tell where an item belongs. */
    categoryName?: string;
    onPick: (product: Product) => void;
};

/** Same card as the register: square picture with the price on it, the name underneath. */
export default function ProductCard({ product, quantity, categoryName, onPick }: Props) {
    const from = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price_cents)) : product.base_price_cents;
    const sizes = product.variants.length;

    return (
        <button
            type="button"
            onClick={() => onPick(product)}
            className={cn(
                'group bg-card relative flex flex-col overflow-hidden rounded-xl text-left shadow-sm transition-all duration-150 active:scale-[0.97]',
                quantity > 0 ? 'ring-primary ring-2' : 'ring-border ring-1',
            )}
        >
            <div className="bg-muted relative aspect-square w-full overflow-hidden">
                <Thumb src={product.image_url} name={product.name} className="size-full" />

                {categoryName && (
                    <span className="bg-background/95 text-primary absolute top-1.5 left-1.5 max-w-[70%] truncate rounded-md px-2 py-1 text-sm font-medium shadow-sm">{categoryName}</span>
                )}

                {quantity > 0 && (
                    <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 min-w-8 rounded-md px-2 py-1 text-center text-sm font-semibold shadow-sm tabular-nums">{quantity}</span>
                )}

                <span className="bg-background/95 absolute right-1.5 bottom-1.5 rounded-md px-2 py-1 text-base font-bold shadow-sm tabular-nums">
                    {sizes > 1 && <span className="text-muted-foreground mr-1 text-xs font-normal">from</span>}
                    {pesoShort(from)}
                </span>

                <span className="bg-primary text-primary-foreground absolute bottom-1.5 left-1.5 flex size-10 items-center justify-center rounded-lg shadow-sm group-active:brightness-110">
                    <Plus className="size-5" />
                </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2.5">
                <h3 className="line-clamp-2 text-center text-lg leading-snug font-semibold">{product.name}</h3>
                {sizes > 1 && <p className="text-muted-foreground text-xs">{sizes} sizes</p>}
            </div>
        </button>
    );
}
