import { router } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { printReceipt, ReceiptView } from '@/pages/orders/receipt';
import type { OrderReceipt } from '@/pages/orders/types';
import { reprint } from '@/routes/orders/receipts';

type Props = {
    orderId: number;
    receipt: OrderReceipt | null;
    onOpenChange: (open: boolean) => void;
};

/** Shows the stored receipt snapshot. Printing also counts the print on the receipt. */
export function ReceiptDialog({ orderId, receipt, onOpenChange }: Props) {
    function print() {
        if (!receipt) {
            return;
        }

        printReceipt(receipt.content, receipt.receipt_number);
        router.post(reprint.url({ order: orderId, receipt: receipt.id }), {}, { preserveScroll: true, preserveState: true });
    }

    return (
        <Dialog open={receipt !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Receipt {receipt?.receipt_number}</DialogTitle>
                    <DialogDescription>
                        {receipt && receipt.printed_count > 0
                            ? `Printed ${receipt.printed_count} time${receipt.printed_count === 1 ? '' : 's'}.`
                            : 'Not printed yet.'}
                    </DialogDescription>
                </DialogHeader>

                {receipt && (
                    <div className="rounded-md border bg-white p-2">
                        <ReceiptView content={receipt.content} receiptNumber={receipt.receipt_number} />
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button type="button" onClick={print}>
                        Print
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
