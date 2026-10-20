import { Head } from '@inertiajs/react';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { screenTypeLabels } from '@/lib/kiosk';
import ScreenDialog from '@/pages/kiosk/screens/screen-dialog';
import { index } from '@/routes/kiosk/screens';
import type { ScreenRow } from '@/types/kiosk';

type Props = { screens: ScreenRow[] };

function schedule(s: ScreenRow): string {
    const fmt = (v: string) => new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    if (!s.starts_at && !s.ends_at) return 'Always';
    if (s.starts_at && s.ends_at) return `${fmt(s.starts_at)} to ${fmt(s.ends_at)}`;

    return s.starts_at ? `From ${fmt(s.starts_at)}` : `Until ${fmt(s.ends_at!)}`;
}

export default function ScreensIndex({ screens }: Props) {
    const [dialog, setDialog] = useState<{ open: boolean; screen?: ScreenRow }>({ open: false });

    return (
        <>
            <Head title="Welcome screens" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Welcome screens</h1>
                        <p className="text-muted-foreground text-sm">Promo banners shown on the kiosk when nobody is ordering. Switched-on screens inside their dates rotate in order.</p>
                    </div>
                    <Button onClick={() => setDialog({ open: true })}>Add screen</Button>
                </div>

                {screens.length === 0 ? (
                    <div className="text-muted-foreground rounded-lg border p-10 text-center text-sm">No screens yet. The kiosk shows its plain welcome message until you add one.</div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {screens.map((s) => (
                            <li key={s.id} className="bg-card flex flex-col overflow-hidden rounded-xl border">
                                {s.image_url ? (
                                    <img src={s.image_url} alt="" className="aspect-video w-full object-cover" />
                                ) : (
                                    <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center">
                                        <ImageOff className="size-6" />
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{s.title}</p>
                                            {s.headline && <p className="text-muted-foreground truncate text-sm">{s.headline}</p>}
                                        </div>
                                        <Badge variant={s.showing ? 'default' : 'secondary'}>{s.showing ? 'Showing' : s.is_active ? 'Scheduled' : 'Off'}</Badge>
                                    </div>

                                    <p className="text-muted-foreground text-xs">
                                        {screenTypeLabels[s.type]} · order {s.sort_order} · {schedule(s)}
                                    </p>

                                    <div className="mt-auto pt-2">
                                        <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, screen: s })}>
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ScreenDialog open={dialog.open} screen={dialog.screen} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))} />
        </>
    );
}

ScreensIndex.layout = {
    breadcrumbs: [
        { title: 'Kiosk', href: '/kiosk/devices' },
        { title: 'Welcome screens', href: index() },
    ],
};
