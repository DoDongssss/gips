import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function DetailsSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium transition-colors">
                {title}
                <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 flex flex-col gap-3">{children}</CollapsibleContent>
        </Collapsible>
    );
}
