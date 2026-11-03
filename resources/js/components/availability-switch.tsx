import { router } from '@inertiajs/react';
import { Switch } from '@/components/ui/switch';
import { useCan } from '@/hooks/use-can';

type Props = {
    /** Route helper URL for the PATCH, e.g. availability.url(product.id) */
    url: string;
    available: boolean;
    label: string;
};

/** One-click sold-out toggle. Visible to roles with menu.availability (cashier, manager, owner). */
export function AvailabilitySwitch({ url, available, label }: Props) {
    const { can } = useCan();

    const canToggle = can('menu.view');

    return (
        <div className="flex items-center gap-2">
            <Switch
                checked={available}
                disabled={!canToggle}
                aria-label={`${label}: ${available ? 'available' : 'sold out'}`}
                onCheckedChange={(checked) =>
                    router.patch(url, { is_available: checked }, { preserveScroll: true, preserveState: true })
                }
            />
            <span className={available ? 'text-sm text-muted-foreground' : 'text-sm font-medium text-destructive'}>
                {available ? 'Available' : 'Sold out'}
            </span>
        </div>
    );
}
