import { LayoutGrid } from 'lucide-react';

import { Thumb, tintAt } from '@/kiosk/screens/ui';
import { useDragScroll } from '@/kiosk/use-drag-scroll';
import type { Category } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = {
    categories: Category[];
    /** null means "All". */
    selectedId: number | null;
    onSelect: (id: number | null) => void;
};

const availableIn = (category: Category): number => category.products.filter((p) => p.is_available).length;

/** Categories down the left side, each with a small picture and how many items it holds. */
export default function CategoryRail({ categories, selectedId, onSelect }: Props) {
    const dragScroll = useDragScroll<HTMLElement>();
    const total = categories.reduce((sum, c) => sum + availableIn(c), 0);

    return (
        <nav ref={dragScroll} aria-label="Categories" className="no-scrollbar bg-card w-48 shrink-0 touch-pan-y space-y-1.5 overflow-y-auto overscroll-contain border-r p-2 landscape:w-60">
            <RailItem selected={selectedId === null} onClick={() => onSelect(null)} name="All" count={total} thumb={<span className={cn('flex size-14 shrink-0 items-center justify-center rounded-md', selectedId === null ? 'bg-primary-foreground/20' : 'bg-muted')}><LayoutGrid className="size-6" /></span>} />

            {categories.map((category, i) => {
                const cover = category.products.find((p) => p.is_available && p.image_url)?.image_url ?? null;

                return (
                    <RailItem
                        key={category.id}
                        selected={selectedId === category.id}
                        onClick={() => onSelect(category.id)}
                        name={category.name}
                        count={availableIn(category)}
                        thumb={<Thumb src={cover} name={category.name} tint={tintAt(i)} fallback="letter" className="size-14 shrink-0 rounded-md text-2xl" />}
                    />
                );
            })}
        </nav>
    );
}

function RailItem({ selected, onClick, name, count, thumb }: { selected: boolean; onClick: () => void; name: string; count: number; thumb: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cn('flex w-full items-center gap-3 rounded-lg p-2 pr-2.5 text-left transition-all duration-150 active:scale-[0.98]', selected ? 'bg-primary text-primary-foreground shadow-sm' : 'active:bg-muted')}
        >
            {thumb}
            <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-lg leading-tight font-semibold">{name}</span>
                <span className={cn('block text-sm tabular-nums', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{count} items</span>
            </span>
        </button>
    );
}
