import { useSyncExternalStore } from 'react';

import type { PrintJob } from '@/lib/printer/receipt';
import { createTransport, isSupported, unsupportedMessage } from '@/lib/printer/transports';
import type { Transport } from '@/lib/printer/transports';
import type { PrinterSettings } from '@/types/printer';

export type PrinterState = {
    status: 'idle' | 'connecting' | 'ready' | 'lost' | 'error';
    label: string | null;
    error: string | null;
};

/**
 * The one printer connection of this browser, shared by the Printer settings page and (next) the register.
 * Direct connections (USB, Bluetooth, Serial) report when the printer goes away; browser print cannot.
 */
let transport: Transport | null = null;
let state: PrinterState = { status: 'idle', label: null, error: null };
let signature = '';
const listeners = new Set<() => void>();

function set(next: Partial<PrinterState>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
}

/** Use the connection type chosen in Settings. Switching type drops the old connection. */
export function configure(settings: PrinterSettings): void {
    const next = `${settings.printer_connection}|${settings.printer_serial_baud}|${settings.printer_paper_width}`;

    if (next === signature && transport) return;

    void transport?.disconnect();
    signature = next;
    transport = createTransport(settings.printer_connection, { baudRate: settings.printer_serial_baud, widthMm: settings.printer_paper_width });
    transport.onLost(() => set({ status: 'lost', error: 'The printer was disconnected.' }));
    // Browser print has nothing to connect: it is always ready.
    set(settings.printer_connection === 'browser' ? { status: 'ready', label: 'Browser print', error: null } : { status: 'idle', label: null, error: null });
}

export async function connect(): Promise<void> {
    if (!transport) return;
    if (!isSupported(transport.kind)) return set({ status: 'error', error: unsupportedMessage(transport.kind) });

    set({ status: 'connecting', error: null });

    try {
        set({ status: 'ready', label: await transport.connect(), error: null });
    } catch (error) {
        // Closing the picker is not an error.
        const cancelled = (error as Error).name === 'NotFoundError' || /cancel/i.test((error as Error).message);
        set(cancelled ? { status: 'idle', error: null } : { status: 'error', error: (error as Error).message });
    }
}

/** Reconnect without a click, when the browser still has permission. */
export async function restore(): Promise<void> {
    if (!transport || state.status === 'ready') return;

    try {
        const label = await transport.restore();
        if (label) set({ status: 'ready', label, error: null });
    } catch {
        // Needs a click: the Connect button is shown.
    }
}

export async function disconnect(): Promise<void> {
    await transport?.disconnect();
    set({ status: 'idle', label: null, error: null });
}

/** Print one job, `copies` times. */
export async function print(job: PrintJob, copies = 1): Promise<void> {
    if (!transport) throw new Error('The printer is not set up.');
    if (state.status !== 'ready') throw new Error('The printer is not connected.');

    try {
        for (let i = 0; i < copies; i++) {
            await transport.print(job);
        }
    } catch (error) {
        set({ status: 'lost', error: (error as Error).message });
        throw error;
    }
}

export function usePrinter(): PrinterState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        () => state,
        () => state,
    );
}
