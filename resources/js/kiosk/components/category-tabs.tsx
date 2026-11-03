import type { Category } from '@/kiosk/types';
import { cn } from '@/lib/utils';

type Props = {
    categories: Category[];
    /** null means "All". */
    selectedId: number | null;
    onSelect: (id: number | null) => void;
};

const availableIn = (category: Category): number => category.products.filter((p) => p.is_available).length;

/** "All" first, then one tab per category, each with how many items it holds. Same idea as the register menu. */
export default function CategoryTabs({ categories, selectedId, onSelect }: Props) {
    const tabs = [{ id: null as number | null, name: 'All', count: categories.reduce((sum, c) => sum + availableIn(c), 0) }, ...categories.map((c) => ({ id: c.id as number | null, name: c.name, count: availableIn(c) }))];

    return (
        <div className="bg-card border-b px-4 py-2">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Categories">
                {tabs.map((tab) => {
                    const selected = tab.id === selectedId;

                    return (
                        <button
                            key={tab.id ?? 'all'}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => onSelect(tab.id)}
                            className={cn(
                                'flex h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-lg font-medium whitespace-nowrap transition-all duration-150 active:scale-95',
                                selected ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-foreground/80',
                            )}
                        >
                            {tab.name}
                            <span className={cn('rounded-md px-1.5 py-0.5 text-sm tabular-nums', selected ? 'bg-primary-foreground/20' : 'bg-background text-muted-foreground')}>{tab.count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
