import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { configureDevice, connectionNeedsConnect, effectiveSettings } from '@/lib/printer/device-choice';
import { connect, restore, usePrinter } from '@/lib/printer/printer';
import { dropQueued, printerSettingsQuery, printQueued, reportPrinterStatus, usePrintQueue, useRegisterPrinterHealth } from '@/lib/printer/print-sale';

/**
 * Lives on the register. Keeps this browser's printer connected, tells the server when it stops working,
 * and shows the cashier what to do (connect again, print the receipts that were waiting).
 */
export function PrinterBanner() {
    const { data: settings } = useQuery(printerSettingsQuery);
    const printer = usePrinter();
    const queue = usePrintQueue();
    const deviceSettings = settings ? effectiveSettings(settings) : undefined;
    const health = useRegisterPrinterHealth(settings);
    const [busy, setBusy] = useState(false);
    const lastSent = useRef('');

    // Use this tablet's connection (store setting or local override) and reconnect when the browser remembers the printer.
    useEffect(() => {
        if (settings) {
            configureDevice(settings);
            void restore();
        }
    }, [settings]);

    // Tell the server when this register's printer state changes (Pusher handles alerts for managers).
    useEffect(() => {
        if (!settings || !deviceSettings) {
            return;
        }

        const signature = `${health.online}|${health.message}|${deviceSettings.printer_connection}`;

        if (signature === lastSent.current) {
            return;
        }

        lastSent.current = signature;
        void reportPrinterStatus(health.online, health.message, deviceSettings.printer_connection);
    }, [settings, deviceSettings, health.online, health.message]);

    // Printer came back by itself (restored or reconnected): print what was waiting.
    useEffect(() => {
        if (settings && deviceSettings && printer.status === 'ready' && queue.length > 0 && deviceSettings.printer_connection !== 'browser') {
            void printQueued(settings);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printer.status]);

    if (!settings) return null;

    const offline = !health.online && printer.status !== 'connecting';

    if (!offline && queue.length === 0) return null;

    async function printWaiting() {
        setBusy(true);

        const mine = effectiveSettings(settings!);
        if (connectionNeedsConnect(mine.printer_connection) && printer.status !== 'ready') {
            configureDevice(settings!);
            await connect();
        }

        const done = await printQueued(settings!);
        setBusy(false);

        if (done > 0) toast.success(`${done} receipt${done === 1 ? '' : 's'} printed.`);
    }

    return (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-base text-red-900">
            <span>
                {offline ? <strong>Printer offline. </strong> : null}
                {offline ? `${health.message} Receipts will wait here until it is back.` : null}
                {queue.length > 0 && (
                    <span className={offline ? 'ml-1' : ''}>
                        {queue.length} receipt{queue.length === 1 ? '' : 's'} waiting to print.
                    </span>
                )}
            </span>

            <span className="flex gap-2">
                {offline && deviceSettings && connectionNeedsConnect(deviceSettings.printer_connection) && (
                    <Button size="sm" className="h-10" disabled={printer.status === 'connecting'} onClick={() => void connect()}>
                        Connect printer
                    </Button>
                )}
                {queue.length > 0 && (
                    <>
                        <Button size="sm" variant="outline" className="h-10" disabled={busy} onClick={() => void printWaiting()}>
                            {busy ? 'Printing…' : 'Print waiting receipts'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-10" disabled={busy} onClick={() => window.confirm('Forget the waiting receipts? They stay available in Orders.') && dropQueued()}>
                            Dismiss
                        </Button>
                    </>
                )}
            </span>
        </div>
    );
}
