import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';

import { Button } from '@/components/ui/button';
import { useShiftGate } from '@/hooks/use-shift-gate';
import { index as shiftsIndex } from '@/routes/shifts';

/** Blocks the register when an open shift is required but missing. */
export function ShiftRequiredGate({ children }: PropsWithChildren) {
    const { blocked, loaded } = useShiftGate();

    if (!loaded) {
        return children;
    }

    if (!blocked) {
        return children;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Open your shift first</h2>
            <p className="text-muted-foreground max-w-md text-base">
                Payments and new orders need an open cash shift. Open the drawer on the Shift page, then come back here.
            </p>
            <Button asChild size="lg" className="h-12 px-8">
                <Link href={shiftsIndex.url()}>Go to Shift</Link>
            </Button>
        </div>
    );
}
