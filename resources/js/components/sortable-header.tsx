import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SortableHeaderProps = {
    title: string;
    sorted: false | 'asc' | 'desc';
    onToggle?: (event: unknown) => void;
    className?: string;
};

export function SortableHeader({ title, sorted, onToggle, className }: SortableHeaderProps) {
    const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn('-ml-3 h-8 gap-1.5 px-3 text-xs font-medium', className)}
        >
            {title}
            <Icon className={cn('size-3.5', sorted ? 'text-foreground' : 'text-muted-foreground')} />
        </Button>
    );
}