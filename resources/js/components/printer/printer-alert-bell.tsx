import { Link } from '@inertiajs/react';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAlerts } from '@/hooks/use-alerts';
import { useCan } from '@/hooks/use-can';

/** Header icon: red count when a register's printer stopped working. Renders nothing without device.manage. */
export function PrinterAlertBell() {
    const { can } = useCan();
    const allowed = can('device.manage');
    const { data } = useAlerts((alerts) => alerts.printers);

    if (!allowed) return null;

    const count = data?.count ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `${count} printer offline` : 'All printers working'}>
                    <Printer className="size-5" />
                    {count > 0 && <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white">{count}</span>}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Receipt printers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {count === 0 ? (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">All open registers can print.</p>
                ) : (
                    <ul>
                        {data!.items.map((item) => (
                            <li key={item.id} className="px-2 py-1.5 text-sm">
                                <span className="font-medium">{item.name}'s register</span>
                                <span className="text-destructive"> cannot print</span>
                                <span className="text-muted-foreground block text-xs">{item.message}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <DropdownMenuSeparator />
                <div className="p-1">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href="/settings/printer">Printer settings</Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
