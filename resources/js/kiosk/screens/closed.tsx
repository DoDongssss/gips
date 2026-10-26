import { Store } from 'lucide-react';

import { Frame } from '@/kiosk/screens/ui';

export default function ClosedScreen({ message }: { message?: string | null }) {
    return (
        <Frame className="bg-secondary items-center justify-center gap-10 p-12 text-center">
            <span className="bg-card text-muted-foreground flex size-40 items-center justify-center rounded-full shadow-md">
                <Store className="size-16" strokeWidth={1.5} />
            </span>
            <div className="max-w-3xl space-y-4">
                <p className="text-6xl leading-tight font-semibold tracking-tight">Sorry, we are not taking orders here right now</p>
                <p className="text-muted-foreground text-3xl">{message ?? 'Please order at the counter.'}</p>
            </div>
        </Frame>
    );
}
