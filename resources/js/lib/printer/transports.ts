/* eslint-disable @typescript-eslint/no-explicit-any -- WebUSB, Web Bluetooth and Web Serial have no types in the standard DOM library. */
import type { PrintJob } from '@/lib/printer/receipt';
import type { PrinterConnection } from '@/types/printer';

export type Transport = {
    readonly kind: PrinterConnection;
    /** Ask the person to pick the printer (must run from a click). Returns a label for the device. */
    connect(): Promise<string>;
    /** Reconnect to the printer this browser already has permission for, without a click. null = not possible. */
    restore(): Promise<string | null>;
    print(job: PrintJob): Promise<void>;
    disconnect(): Promise<void>;
    /** Called when the printer goes away (cable pulled, out of range, switched off). */
    onLost(callback: () => void): void;
};

const nav = () => navigator as any;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const remember = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // storage blocked: the printer just will not reconnect by itself
    }
};
const recall = <T>(key: string): T | null => {
    try {
        return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
    } catch {
        return null;
    }
};

export function isSupported(kind: PrinterConnection): boolean {
    if (typeof navigator === 'undefined') return false;

    return kind === 'browser' ? true : kind === 'usb' ? 'usb' in navigator : kind === 'bluetooth' ? 'bluetooth' in navigator : 'serial' in navigator;
}

export const unsupportedMessage = (kind: PrinterConnection): string =>
    `This browser cannot use a ${kind === 'usb' ? 'USB' : kind === 'bluetooth' ? 'Bluetooth' : 'serial'} printer directly. Use Chrome or Edge, or choose Browser print.`;

// ---------------------------------------------------------------- USB
class UsbTransport implements Transport {
    readonly kind = 'usb' as const;
    private device: any = null;
    private endpoint = 0;
    private lost: () => void = () => undefined;

    async connect() {
        const device = await nav().usb.requestDevice({ filters: [] });
        await this.open(device);
        remember('printer.usb', { vendorId: device.vendorId, productId: device.productId });

        return device.productName || 'USB printer';
    }

    async restore() {
        if (!isSupported('usb')) return null;
        const saved = recall<{ vendorId: number; productId: number }>('printer.usb');
        if (!saved) return null;

        const device = (await nav().usb.getDevices()).find((d: any) => d.vendorId === saved.vendorId && d.productId === saved.productId);
        if (!device) return null;

        await this.open(device);

        return device.productName || 'USB printer';
    }

    private async open(device: any) {
        try {
            await device.open();
            if (device.configuration === null) await device.selectConfiguration(1);

            // Prefer the printer class (7); otherwise any interface with a bulk OUT endpoint.
            let pick: { iface: number; endpoint: number; rank: number } | null = null;
            for (const iface of device.configuration.interfaces) {
                for (const alt of iface.alternates) {
                    const out = alt.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');
                    if (out && (!pick || (alt.interfaceClass === 7 && pick.rank < 2))) {
                        pick = { iface: iface.interfaceNumber, endpoint: out.endpointNumber, rank: alt.interfaceClass === 7 ? 2 : 1 };
                    }
                }
            }
            if (!pick) throw new Error('No place to send data was found on this USB device.');

            await device.claimInterface(pick.iface);
            this.device = device;
            this.endpoint = pick.endpoint;
        } catch (error) {
            const name = (error as Error).name;
            if (name === 'SecurityError' || name === 'NetworkError' || /access denied|claim/i.test((error as Error).message)) {
                throw new Error('Windows (or the tablet) is holding this printer with its own driver, so the browser cannot use it directly. Use Bluetooth or Browser print, or install a WinUSB driver for this printer.');
            }
            throw error;
        }

        nav().usb.addEventListener('disconnect', (event: any) => {
            if (event.device === this.device) {
                this.device = null;
                this.lost();
            }
        });
    }

    async print(job: PrintJob) {
        if (!this.device) throw new Error('The USB printer is not connected.');

        for (let i = 0; i < job.bytes.length; i += 4096) {
            await this.device.transferOut(this.endpoint, job.bytes.slice(i, i + 4096));
        }
    }

    async disconnect() {
        try {
            await this.device?.close();
        } finally {
            this.device = null;
        }
    }

    onLost(callback: () => void) {
        this.lost = callback;
    }
}

// ---------------------------------------------------------------- Bluetooth LE
// Services that cheap and branded ESC/POS printers commonly use. The printer must offer one of these (or any writable characteristic).
const BLE_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
];

class BluetoothTransport implements Transport {
    readonly kind = 'bluetooth' as const;
    private device: any = null;
    private characteristic: any = null;
    private lost: () => void = () => undefined;

    async connect() {
        const device = await nav().bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
        await this.open(device);
        remember('printer.bluetooth', { id: device.id, name: device.name });

        return device.name || 'Bluetooth printer';
    }

    /** Chrome can only reconnect to a remembered Bluetooth device when it offers getDevices(); otherwise a click is needed. */
    async restore() {
        const bluetooth = nav().bluetooth;
        const saved = recall<{ id: string }>('printer.bluetooth');
        if (!bluetooth?.getDevices || !saved) return null;

        const device = (await bluetooth.getDevices()).find((d: any) => d.id === saved.id);
        if (!device) return null;

        await this.open(device);

        return device.name || 'Bluetooth printer';
    }

    private async open(device: any) {
        const server = await device.gatt.connect();
        let found: any = null;

        for (const service of await server.getPrimaryServices()) {
            for (const characteristic of await service.getCharacteristics()) {
                if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
                    found = characteristic;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            device.gatt.disconnect();
            throw new Error('This printer does not accept data over Bluetooth LE. Many cheap printers only support "classic" Bluetooth: use Serial (paired as a COM port) or Browser print instead.');
        }

        this.device = device;
        this.characteristic = found;
        device.addEventListener('gattserverdisconnected', () => {
            this.characteristic = null;
            this.lost();
        });
    }

    async print(job: PrintJob) {
        if (!this.characteristic) throw new Error('The Bluetooth printer is not connected.');

        const withoutResponse = this.characteristic.properties.writeWithoutResponse && this.characteristic.writeValueWithoutResponse;

        for (let i = 0; i < job.bytes.length; i += 100) {
            const chunk = job.bytes.slice(i, i + 100);
            await (withoutResponse ? this.characteristic.writeValueWithoutResponse(chunk) : this.characteristic.writeValue(chunk));
            await sleep(15); // small printers drop data when it arrives too fast
        }
    }

    async disconnect() {
        this.device?.gatt?.disconnect();
        this.device = null;
        this.characteristic = null;
    }

    onLost(callback: () => void) {
        this.lost = callback;
    }
}

// ---------------------------------------------------------------- Serial (USB-serial, or Bluetooth paired as a COM port)
class SerialTransport implements Transport {
    readonly kind = 'serial' as const;
    private port: any = null;
    private lost: () => void = () => undefined;

    constructor(private baudRate: number) {}

    async connect() {
        const port = await nav().serial.requestPort();
        await this.open(port);
        remember('printer.serial', { saved: true });

        return 'Serial printer';
    }

    async restore() {
        if (!isSupported('serial') || !recall('printer.serial')) return null;

        const [port] = await nav().serial.getPorts();
        if (!port) return null;

        await this.open(port);

        return 'Serial printer';
    }

    private async open(port: any) {
        await port.open({ baudRate: this.baudRate });
        this.port = port;
        nav().serial.addEventListener('disconnect', (event: any) => {
            if (event.target === this.port || event.port === this.port) {
                this.port = null;
                this.lost();
            }
        });
    }

    async print(job: PrintJob) {
        if (!this.port?.writable) throw new Error('The serial printer is not connected.');

        const writer = this.port.writable.getWriter();
        try {
            await writer.write(job.bytes);
        } finally {
            writer.releaseLock();
        }
    }

    async disconnect() {
        try {
            await this.port?.close();
        } finally {
            this.port = null;
        }
    }

    onLost(callback: () => void) {
        this.lost = callback;
    }
}

// ---------------------------------------------------------------- Browser print
/** Prints through the browser's print dialog to whatever printer the computer or tablet has installed. It cannot see the printer's state. */
class BrowserTransport implements Transport {
    readonly kind = 'browser' as const;

    constructor(private widthMm: number) {}

    async connect() {
        return 'Browser print';
    }

    async restore() {
        return 'Browser print';
    }

    async print(job: PrintJob) {
        if (job.html === '') return; // the cash drawer needs a direct connection

        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        document.body.appendChild(frame);

        const doc = frame.contentDocument!;
        doc.open();
        doc.write(
            `<html><head><style>@page{size:${this.widthMm}mm auto;margin:0}body{width:${this.widthMm - 6}mm;margin:3mm;font:12px/1.35 monospace;color:#000}hr{border:0;border-top:1px dashed #000}</style></head><body>${job.html}</body></html>`,
        );
        doc.close();

        frame.contentWindow!.focus();
        frame.contentWindow!.print();
        setTimeout(() => frame.remove(), 2000);
    }

    async disconnect() {
        // nothing to release
    }

    onLost() {
        // the browser cannot tell
    }
}

export function createTransport(kind: PrinterConnection, options: { baudRate: number; widthMm: number }): Transport {
    switch (kind) {
        case 'usb':
            return new UsbTransport();
        case 'bluetooth':
            return new BluetoothTransport();
        case 'serial':
            return new SerialTransport(options.baudRate);
        default:
            return new BrowserTransport(options.widthMm);
    }
}
