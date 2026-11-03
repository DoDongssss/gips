import { Store } from 'lucide-react';

import { Frame } from '@/kiosk/screens/ui';

export default function ClosedScreen({ message }: { message?: string | null }) {
    return (
        <Frame className="bg-secondary items-center justify-center gap-8 p-10 text-center">
            <span className="bg-card text-muted-foreground ring-border flex size-32 items-center justify-center rounded-2xl shadow-sm ring-1">
                <Store className="size-14" strokeWidth={1.5} />
            </span>
            <div className="max-w-3xl space-y-3">
                <p className="text-5xl leading-tight font-semibold tracking-tight">Sorry, we are not taking orders here right now</p>
                <p className="text-muted-foreground text-2xl">{message ?? 'Please order at the counter.'}</p>
            </div>
        </Frame>
    );
}
