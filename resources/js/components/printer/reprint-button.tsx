import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { connect, usePrinter } from '@/lib/printer/printer';
import { printerSettingsQuery, reprintSale } from '@/lib/printer/print-sale';

/** Prints a paid order's receipt again. Connects the printer first when this browser needs a click for that. */
export function ReprintButton({ orderId, className }: { orderId: number; className?: string }) {
    const { data: settings } = useQuery(printerSettingsQuery);
    const printer = usePrinter();
    const [busy, setBusy] = useState(false);

    if (!settings) return null;

    async function run() {
        setBusy(true);

        try {
            if (settings!.printer_connection !== 'browser' && printer.status !== 'ready') {
                await connect();
            }

            await reprintSale(orderId, settings!);
            toast.success('Receipt sent to the printer.');
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Button size="sm" variant="outline" className={className ?? 'h-11 px-3 text-base'} disabled={busy} onClick={() => void run()}>
            {busy ? 'Printing…' : 'Receipt'}
        </Button>
    );
}
