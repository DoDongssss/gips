import type { PrinterConnection, PrinterSettings } from '@/types/printer';

/**
 * Each device (browser) can print differently from the store setting: the tablet uses RawBT while the PC next to it
 * uses USB. The choice lives in this browser only; empty = follow the store setting.
 */
const KEY = 'gips.printer.connection';
const ALL: PrinterConnection[] = ['browser', 'usb', 'bluetooth', 'serial', 'rawbt'];

export const isAndroid = (): boolean => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

export function getDeviceConnection(): PrinterConnection | null {
    try {
        const value = localStorage.getItem(KEY) as PrinterConnection | null;

        return value && ALL.includes(value) ? value : null;
    } catch {
        return null;
    }
}

export function setDeviceConnection(value: PrinterConnection | null): void {
    try {
        if (value) localStorage.setItem(KEY, value);
        else localStorage.removeItem(KEY);
    } catch {
        // storage blocked: the store setting is used
    }
}

/** The settings this device really prints with. RawBT only exists on Android, so elsewhere it falls back to Browser print. */
export function effectiveSettings(settings: PrinterSettings): PrinterSettings {
    let connection = getDeviceConnection() ?? settings.printer_connection;

    if (connection === 'rawbt' && !isAndroid()) connection = 'browser';

    return connection === settings.printer_connection ? settings : { ...settings, printer_connection: connection };
}
