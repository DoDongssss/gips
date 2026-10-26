import { Plus } from 'lucide-react';

import { pesoShort } from '@/kiosk/format';
import { Thumb } from '@/kiosk/screens/ui';
import type { Product } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = {
    product: Product;
    /** How many of this product are already in the order. */
    quantity: number;
    onPick: (product: Product) => void;
};

/** Photo first: the picture fills the top of the card, the price and the add button sit at the bottom. */
export default function ProductCard({ product, quantity, onPick }: Props) {
    const from = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price_cents)) : product.base_price_cents;

    return (
        <button
            type="button"
            onClick={() => onPick(product)}
            className={cn(
                'bg-card relative flex flex-col overflow-hidden rounded-2xl text-left shadow-sm ring-2 transition-all duration-150 active:scale-[0.97]',
                quantity > 0 ? 'ring-primary' : 'ring-transparent',
            )}
        >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Thumb src={product.image_url} name={product.name} className="size-full" />
                {quantity > 0 && (
                    <span className="bg-primary text-primary-foreground absolute top-3 right-3 flex min-w-10 items-center justify-center rounded-full px-3 py-1.5 text-lg font-bold shadow-md tabular-nums">
                        {quantity}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="line-clamp-2 min-h-14 text-xl leading-snug font-semibold">{product.name}</p>
                {product.description && <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{product.description}</p>}

                <div className="mt-auto flex items-center justify-between pt-3">
                    <p className="text-2xl font-semibold tabular-nums">
                        {product.variants.length > 1 && <span className="text-muted-foreground mr-1.5 text-sm font-normal">from</span>}
                        {pesoShort(from)}
                    </p>
                    <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full shadow-sm">
                        <Plus className="size-6" />
                    </span>
                </div>
            </div>
        </button>
    );
}
