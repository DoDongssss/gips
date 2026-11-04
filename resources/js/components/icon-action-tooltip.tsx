import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
    label: string;
    children: ReactElement;
};

/** Icon-only table actions: visible label on hover/focus. */
export function IconActionTooltip({ label, children }: Props) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}
