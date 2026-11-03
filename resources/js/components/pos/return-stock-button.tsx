import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { errorList, posPost } from '@/lib/pos-http';
import { uuid } from '@/lib/uuid';

type Props = {
    orderId: number;
    orderNumber: string;
    status: string;
    /** True when the order has at least one refund. */
    hasRefunds: boolean;
    onDone?: () => void;
};

/**
 * Puts the ingredients of a voided or refunded order back in stock.
 * Voids before the kitchen started return stock on their own; use this when the food was never made
 * (for example a refund, or a void after the order was already confirmed and nothing was prepared).
 */
export function ReturnStockButton({ orderId, orderNumber, status, hasRefunds, onDone }: Props) {
    const { can } = useCan();
    const eligible = (status === 'voided' || status === 'cancelled' || hasRefunds) && (can('order.void') || can('payment.refund'));

    const returnStock = useMutation({
        mutationFn: () => posPost<{ data: { returned: number } }>(`/api/v1/orders/${orderId}/return-stock`, {}, uuid()),
        onSuccess: ({ data }) => {
            toast.success(data.returned > 0 ? `Stock returned for ${data.returned} ingredient(s).` : 'Nothing to return. It was already returned or never deducted.');
            onDone?.();
        },
        onError: (error) => errorList(error).forEach((message) => toast.error(message)),
    });

    if (!eligible) {
        return null;
    }

    return (
        <Button
            variant="outline"
            disabled={returnStock.isPending}
            onClick={() => {
                if (window.confirm(`Return the ingredients of order ${orderNumber} to stock? Only do this if the items were never made.`)) {
                    returnStock.mutate();
                }
            }}
        >
            {returnStock.isPending ? 'Returning…' : 'Return items to stock'}
        </Button>
    );
}
