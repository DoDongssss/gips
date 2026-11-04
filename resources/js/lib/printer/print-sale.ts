import { toast } from 'sonner';
import { useSyncExternalStore } from 'react';

import { useEffect } from 'react';

import { effectiveSettings } from '@/lib/printer/device-choice';
import { configure, print, restore, usePrinter } from '@/lib/printer/printer';
import { drawerPulse } from '@/lib/printer/receipt';
import { saleReceipt } from '@/lib/printer/sale-receipt';
import { posGet, posPost } from '@/lib/pos-http';
import { uuid } from '@/lib/uuid';
import type { OrderDetail, ReceiptContent } from '@/pages/orders/types';
import type { PrinterSettings } from '@/types/printer';

/* ---------------- settings (the register reads them once a minute at most) ---------------- */

export const printerSettingsQuery = {
    queryKey: ['pos', 'printer-settings'],
    queryFn: async () => (await posGet<{ data: PrinterSettings }>('/api/v1/pos/printer')).data,
    staleTime: 60_000,
} as const;

/* ---------------- receipts that could not be printed wait here, in this browser ---------------- */

type Queued = { id: string; orderNumber: string; content: ReceiptContent; openDrawer: boolean };

const QUEUE_KEY = 'gips.print-queue';
const queueListeners = new Set<() => void>();
const EMPTY_QUEUE: Queued[] = [];
let queue: Queued[] = readQueue();

function readQueue(): Queued[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Queued[];
    } catch {
        return [];
    }
}

function writeQueue(next: Queued[]) {
    queue = next;

    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(next.slice(-50)));
    } catch {
        // storage blocked: the queue only lives until the page is closed
    }

    queueListeners.forEach((listener) => listener());
}

export function usePrintQueue(): Queued[] {
    return useSyncExternalStore(
        (listener) => {
            queueListeners.add(listener);

            return () => queueListeners.delete(listener);
        },
        () => queue,
        () => EMPTY_QUEUE,
    );
}

/* ---------------- printing ---------------- */

async function loadOrder(orderId: number, known?: unknown): Promise<OrderDetail> {
    const direct = ((known as { data?: OrderDetail } | null)?.data ?? known) as OrderDetail | undefined;

    if (direct?.receipts && direct.receipts.length > 0) {
        return direct;
    }

    return (await posGet<{ data: OrderDetail }>(`/api/v1/orders/${orderId}`)).data;
}

const saleContent = (order: OrderDetail): ReceiptContent | null => order.receipts?.find((r) => r.type === 'sale')?.content ?? null;

async function printContent(content: ReceiptContent, storeSettings: PrinterSettings, options: { reprint?: boolean; drawer?: boolean }) {
    // This device may print differently from the store setting (the tablet through RawBT, a PC through USB).
    const settings = effectiveSettings(storeSettings);
    configure(settings);
    await restore();

    await print(saleReceipt(content, settings, { reprint: options.reprint }), settings.printer_copies);

    // The drawer opens after the receipt so a paper jam does not leave it open with nothing printed.
    if (options.drawer && settings.printer_open_drawer && settings.printer_connection !== 'browser') {
        await print(drawerPulse(settings));
    }
}

export type PrintOutcome = 'printed' | 'queued' | 'skipped';

/** Right after a payment: print if the store wants that, otherwise keep the receipt for later. */
export async function printAfterPayment(orderId: number, settings: PrinterSettings | undefined, options: { cash: boolean; paid?: unknown }): Promise<PrintOutcome> {
    if (!settings || !settings.printer_auto_print) {
        return 'skipped';
    }

    let content: ReceiptContent | null = null;

    try {
        content = saleContent(await loadOrder(orderId, options.paid));
    } catch {
        toast.error('The sale is saved, but its receipt could not be loaded. Print it from Orders.');

        return 'skipped';
    }

    if (!content) {
        return 'skipped';
    }

    try {
        await printContent(content, settings, { drawer: options.cash });

        return 'printed';
    } catch (error) {
        writeQueue([...queue, { id: uuid(), orderNumber: content.order_number, content, openDrawer: options.cash }]);
        toast.error(`Receipt ${content.order_number} did not print: ${(error as Error).message} It is waiting to be printed.`);

        return 'queued';
    }
}

/** Print an old receipt again, marked REPRINT. Throws with a readable message when the printer is not working. */
export async function reprintSale(orderId: number, settings: PrinterSettings): Promise<void> {
    const content = saleContent(await loadOrder(orderId));

    if (!content) {
        throw new Error('This order has no sale receipt.');
    }

    await printContent(content, settings, { reprint: true });
}

/** Print everything that was waiting, oldest first. Stops at the first failure so nothing is lost. */
export async function printQueued(settings: PrinterSettings): Promise<number> {
    let done = 0;

    for (const item of [...queue]) {
        try {
            await printContent(item.content, settings, { drawer: false });
            writeQueue(queue.filter((q) => q.id !== item.id));
            done++;
        } catch (error) {
            toast.error((error as Error).message);
            break;
        }
    }

    return done;
}

export const dropQueued = () => writeQueue([]);

/* ---------------- telling the server ---------------- */

/** Is this register's printer usable? Browser print and RawBT are always "yes": they cannot tell otherwise. */
export function useRegisterPrinterHealth(storeSettings: PrinterSettings | undefined): { online: boolean; message: string | null } {
    const printer = usePrinter();
    const settings = storeSettings ? effectiveSettings(storeSettings) : undefined;

    useEffect(() => {
        if (!settings) return;
        configure(settings);
        void restore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings?.printer_connection, settings?.printer_serial_baud, settings?.printer_paper_width]);

    if (!settings || settings.printer_connection === 'browser' || (settings.printer_connection === 'rawbt' && printer.status !== 'error')) {
        return { online: true, message: null };
    }

    if (printer.status === 'ready') {
        return { online: true, message: null };
    }

    return { online: false, message: printer.error ?? (printer.status === 'connecting' ? 'Connecting to the printer…' : 'The printer is not connected on this register.') };
}

export const reportPrinterStatus = (online: boolean, message: string | null, connection: string) =>
    posPost('/api/v1/pos/printer-status', { online, message, connection }, uuid()).catch(() => undefined);
