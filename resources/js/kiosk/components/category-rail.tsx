import { Thumb, tintAt } from '@/kiosk/screens/ui';
import type { Category } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = {
    categories: Category[];
    /** null while a search is showing results from every category. */
    selectedId: number | null;
    onSelect: (id: number) => void;
};

/** Vertical list on a landscape tablet, a scrolling row on a portrait one. */
export default function CategoryRail({ categories, selectedId, onSelect }: Props) {
    const DEFAULT_PRODUCT_IMAGE = '/storage/menu/products/default_product.jpg';

    return (
        <nav
            aria-label="Categories"
            className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-6 py-3 portrait:px-8 landscape:w-72 landscape:flex-col landscape:overflow-x-visible landscape:overflow-y-auto landscape:px-0 landscape:py-0 landscape:pr-3 landscape:pb-6 landscape:pl-8"
        >
            {categories.map((category, i) => {
                const selected = category.id === selectedId;
                const cover = category.products.find((p) => p.is_available && p.image_url)?.image_url ?? DEFAULT_PRODUCT_IMAGE;
                const available = category.products.filter((p) => p.is_available).length;

                return (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => onSelect(category.id)}
                        aria-pressed={selected}
                        className={cn(
                            'flex shrink-0 items-center gap-3 rounded-2xl p-2.5 pr-6 text-left shadow-sm transition-all duration-150 active:scale-95 portrait:pr-8 landscape:pr-4',
                            selected ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card',
                        )}
                    >
                        <Thumb src={cover} name={category.name} tint={tintAt(i)} className="size-14 shrink-0 rounded-xl text-2xl portrait:size-16" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-xl leading-tight font-semibold whitespace-nowrap landscape:whitespace-normal">{category.name}</span>
                            <span className={cn('block text-sm', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{available} items</span>
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
