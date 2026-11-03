import { Head, useForm } from '@inertiajs/react';
import { Plug, Printer as PrinterIcon, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { configure, connect, disconnect, print, restore, usePrinter } from '@/lib/printer/printer';
import { drawerPulse, testReceipt } from '@/lib/printer/receipt';
import { update } from '@/routes/printer';
import type { BusinessInfo, PrinterConnection, PrinterSettings } from '@/types/printer';

type Props = { settings: PrinterSettings; connections: Record<PrinterConnection, string>; business: BusinessInfo };

const HELP: Record<PrinterConnection, string> = {
    browser: 'Prints through the normal print window to any printer installed on this computer or tablet. The app cannot tell if the paper came out, and it cannot open the cash drawer.',
    usb: 'Chrome or Edge talk to the printer directly over the cable. On Windows this only works when the printer uses a generic (WinUSB) driver; if it does not, choose Bluetooth or Browser print.',
    bluetooth: 'Only printers with Bluetooth LE work (many cheap 58 mm printers do). Pair the printer in the device\'s Bluetooth settings first if it asks. You tap Connect once per session.',
    serial: 'For a USB-to-serial printer, or a Bluetooth printer that Windows pairs as a COM port. Pick the port when you press Connect.',
};

export default function PrinterPage({ settings, connections, business }: Props) {
    const form = useForm<PrinterSettings>(settings);
    const printer = usePrinter();
    const [message, setMessage] = useState<string | null>(null);

    // The browser connection follows the SAVED settings.
    useEffect(() => {
        form.setData(settings);
        configure(settings);
        void restore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);

    const direct = settings.printer_connection !== 'browser';
    const dirty = JSON.stringify(form.data) !== JSON.stringify(settings);

    function save(event: FormEvent) {
        event.preventDefault();
        form.put(update.url(), { preserveScroll: true });
    }

    async function run(action: () => Promise<void>, done: string) {
        setMessage(null);

        try {
            await action();
            setMessage(done);
        } catch (error) {
            setMessage((error as Error).message);
        }
    }

    const badge =
        printer.status === 'ready' ? (
            <Badge className="bg-emerald-600 text-white">{direct ? `Connected: ${printer.label}` : 'Ready'}</Badge>
        ) : printer.status === 'connecting' ? (
            <Badge variant="secondary">Connecting…</Badge>
        ) : printer.status === 'lost' ? (
            <Badge variant="destructive">Disconnected</Badge>
        ) : printer.status === 'error' ? (
            <Badge variant="destructive">Problem</Badge>
        ) : (
            <Badge variant="secondary">Not connected</Badge>
        );

    return (
        <>
            <Head title="Printer" />

            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-xl font-semibold">Printer</h1>
                    <p className="text-muted-foreground text-sm">How receipts are printed. Part of this is saved for the whole store, and part is set up on each register's browser.</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <form onSubmit={save} className="space-y-4 rounded-lg border p-4 md:p-5">
                        <h2 className="font-medium">Store settings</h2>

                        <div className="space-y-1">
                            <label htmlFor="connection" className="text-sm font-medium">
                                Connection
                            </label>
                            <Select value={form.data.printer_connection} onValueChange={(v) => form.setData('printer_connection', v as PrinterConnection)}>
                                <SelectTrigger id="connection">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(connections).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-xs">{HELP[form.data.printer_connection]}</p>
                            {form.errors.printer_connection && <p className="text-destructive text-sm">{form.errors.printer_connection}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="name" className="text-sm font-medium">
                                Printer name
                            </label>
                            <Input id="name" value={form.data.printer_name ?? ''} onChange={(e) => form.setData('printer_name', e.target.value)} placeholder="Counter printer" />
                            {form.errors.printer_name && <p className="text-destructive text-sm">{form.errors.printer_name}</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="paper" className="text-sm font-medium">
                                    Paper width
                                </label>
                                <Select value={String(form.data.printer_paper_width)} onValueChange={(v) => form.setData('printer_paper_width', Number(v) as 58 | 80)}>
                                    <SelectTrigger id="paper">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="58">58 mm (small)</SelectItem>
                                        <SelectItem value="80">80 mm (standard)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="copies" className="text-sm font-medium">
                                    Copies
                                </label>
                                <Input id="copies" type="number" min={1} max={3} value={form.data.printer_copies} onChange={(e) => form.setData('printer_copies', Number(e.target.value))} />
                                {form.errors.printer_copies && <p className="text-destructive text-sm">{form.errors.printer_copies}</p>}
                            </div>
                        </div>

                        {form.data.printer_connection === 'serial' && (
                            <div className="space-y-1">
                                <label htmlFor="baud" className="text-sm font-medium">
                                    Serial speed (baud)
                                </label>
                                <Select value={String(form.data.printer_serial_baud)} onValueChange={(v) => form.setData('printer_serial_baud', Number(v))}>
                                    <SelectTrigger id="baud">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[9600, 19200, 38400, 57600, 115200].map((rate) => (
                                            <SelectItem key={rate} value={String(rate)}>
                                                {rate}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-muted-foreground text-xs">9600 suits most printers. It is in the printer's manual or its self-test page.</p>
                            </div>
                        )}

                        <label className="flex items-center justify-between gap-4">
                            <span>
                                <span className="block text-sm font-medium">Print the receipt automatically after payment</span>
                                <span className="text-muted-foreground block text-xs">Off: the cashier presses Print.</span>
                            </span>
                            <Switch checked={form.data.printer_auto_print} onCheckedChange={(v) => form.setData('printer_auto_print', v)} />
                        </label>

                        <label className="flex items-center justify-between gap-4">
                            <span>
                                <span className="block text-sm font-medium">Open the cash drawer on cash payments</span>
                                <span className="text-muted-foreground block text-xs">The drawer plugs into the printer. Needs a direct connection (not Browser print).</span>
                            </span>
                            <Switch checked={form.data.printer_open_drawer} onCheckedChange={(v) => form.setData('printer_open_drawer', v)} />
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" disabled={!dirty || form.processing} onClick={() => form.setData(settings)}>
                                Undo
                            </Button>
                            <Button type="submit" disabled={!dirty || form.processing}>
                                {form.processing ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </form>

                    <section className="space-y-4 rounded-lg border p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-medium">This browser</h2>
                            {badge}
                        </div>

                        <p className="text-muted-foreground text-sm">
                            {direct
                                ? 'The permission to use the printer belongs to this browser, so every register connects once. Connect and test it here.'
                                : 'Browser print needs no connection. Press Test print to check the printer and paper size.'}
                        </p>
                        {dirty && <p className="bg-muted rounded-md p-3 text-sm">You changed the settings. Save them first, then connect or test.</p>}
                        {printer.error && <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{printer.error}</p>}
                        {message && <p className="bg-muted rounded-md p-3 text-sm">{message}</p>}

                        <div className="flex flex-wrap gap-2">
                            {direct && printer.status !== 'ready' && (
                                <Button type="button" disabled={dirty || printer.status === 'connecting'} onClick={() => void connect()}>
                                    <Plug className="size-4" /> Connect printer
                                </Button>
                            )}
                            {direct && printer.status === 'ready' && (
                                <Button type="button" variant="outline" onClick={() => void disconnect()}>
                                    <Unplug className="size-4" /> Disconnect
                                </Button>
                            )}
                            <Button type="button" variant="outline" disabled={dirty || printer.status !== 'ready'} onClick={() => void run(() => print(testReceipt(settings, business), settings.printer_copies), 'Test sent. Check the paper.')}>
                                <PrinterIcon className="size-4" /> Test print
                            </Button>
                            {direct && (
                                <Button type="button" variant="outline" disabled={dirty || printer.status !== 'ready'} onClick={() => void run(() => print(drawerPulse(settings)), 'Drawer signal sent.')}>
                                    Open cash drawer
                                </Button>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

PrinterPage.layout = {
    breadcrumbs: [
        { title: 'Settings', href: '/settings/printer' },
        { title: 'Printer', href: '/settings/printer' },
    ],
};
