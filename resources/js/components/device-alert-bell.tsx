import { Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { Tablet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCan } from '@/hooks/use-can';
import { posGet } from '@/lib/pos-http';
import { index } from '@/routes/devices';

type Alerts = { count: number; items: { id: number; name: string; type: string; last_seen_at: string | null; minutes: number }[] };

const TYPE_LABEL: Record<string, string> = { kiosk: 'Kiosk', kds: 'Kitchen screen' };

/** Header icon: red count when a paired device stopped reporting. Renders nothing without device.manage. */
export function DeviceAlertBell() {
    const { can } = useCan();
    const allowed = can('device.manage');

    const { data } = useQuery({
        queryKey: ['device', 'alerts'],
        queryFn: async () => (await posGet<{ data: Alerts }>('/api/v1/device/alerts')).data,
        enabled: allowed,
        refetchInterval: 30_000,
    });

    if (!allowed) {
        return null;
    }

    const count = data?.count ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `${count} device offline` : 'All devices online'}>
                    <Tablet className="size-5" />
                    {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white">{count}</span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Devices</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {count === 0 ? (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">All devices are reporting in.</p>
                ) : (
                    <ul>
                        {data!.items.map((device) => (
                            <li key={device.id} className="px-2 py-1.5 text-sm">
                                <span className="font-medium">{device.name}</span>
                                <span className="text-muted-foreground"> ({TYPE_LABEL[device.type] ?? device.type})</span>
                                <span className="text-destructive"> is offline</span>
                                <span className="text-muted-foreground block text-xs">Last seen {device.minutes} min ago. Check its power and Wi-Fi.</span>
                            </li>
                        ))}
                    </ul>
                )}
                <DropdownMenuSeparator />
                <div className="p-1">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href={index()}>Open devices</Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
