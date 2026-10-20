import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ago, deviceTypeLabels } from '@/lib/kiosk';
import DeviceDialog from '@/pages/kiosk/devices/device-dialog';
import PairingDialog from '@/pages/kiosk/devices/pairing-dialog';
import { index, pairingCode, unpair, update } from '@/routes/kiosk/devices';
import type { DeviceRow, PairingInfo, Station } from '@/types/kiosk';

type Props = { devices: DeviceRow[]; pairing: PairingInfo | null; stations: Station[] };

/** Refresh the status column while the page is open. */
const REFRESH_MS = 20_000;

function Status({ d }: { d: DeviceRow }) {
    if (!d.is_active) return <Badge variant="secondary">Off</Badge>;
    if (!d.paired) return <Badge variant="outline">{d.has_pending_code ? 'Waiting for pairing' : 'Not paired'}</Badge>;
    if (d.settings?.is_out_of_service) return <Badge variant="secondary">Out of service</Badge>;

    return d.online ? <Badge>Online</Badge> : <Badge variant="destructive">Offline</Badge>;
}

export default function DevicesIndex({ devices, pairing, stations }: Props) {
    const [dialog, setDialog] = useState<{ open: boolean; device?: DeviceRow }>({ open: false });
    const [code, setCode] = useState<PairingInfo | null>(pairing);
    const [now, setNow] = useState(() => Date.now());

    // A new code arrives as a one-time flash on the response; show it, then forget it.
    useEffect(() => {
        if (pairing) setCode(pairing);
    }, [pairing]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            router.reload({ only: ['devices'], onSuccess: () => setNow(Date.now()) });
        }, REFRESH_MS);

        return () => window.clearInterval(timer);
    }, []);

    function toggleService(d: DeviceRow, outOfService: boolean) {
        router.put(update.url(d.id), { name: d.name, station_id: d.station_id, is_active: d.is_active, settings: { is_out_of_service: outOfService } }, { preserveScroll: true });
    }

    function newCode(d: DeviceRow) {
        const warn = d.paired ? ` "${d.name}" stays signed in until the new code is used.` : '';
        if (confirm(`Issue a new pairing code for "${d.name}"?${warn}`)) {
            router.post(pairingCode.url(d.id), {}, { preserveScroll: true });
        }
    }

    function signOut(d: DeviceRow) {
        if (confirm(`Sign "${d.name}" out? It will stop working until it is paired again.`)) {
            router.post(unpair.url(d.id), {}, { preserveScroll: true });
        }
    }

    return (
        <>
            <Head title="Kiosk devices" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
                        <p className="text-muted-foreground text-sm">Kiosk tablets and other registered screens. Status updates by itself.</p>
                    </div>
                    <Button onClick={() => setDialog({ open: true })}>Add device</Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Device</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Last seen</th>
                                <th className="p-3 text-right font-medium">Customers today</th>
                                <th className="p-3 font-medium">Out of service</th>
                                <th className="w-64 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((d) => (
                                <tr key={d.id} className="border-b last:border-0">
                                    <td className="p-3">
                                        <p className="font-medium">{d.name}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {deviceTypeLabels[d.type]}
                                            {d.app_version ? ` · v${d.app_version}` : ''}
                                            {d.ip_address ? ` · ${d.ip_address}` : ''}
                                        </p>
                                    </td>
                                    <td className="p-3">
                                        <Status d={d} />
                                    </td>
                                    <td className="text-muted-foreground p-3">{d.paired ? ago(d.last_seen_at, now) : '—'}</td>
                                    <td className="p-3 text-right tabular-nums">{d.type === 'kiosk' ? d.sessions_today : '—'}</td>
                                    <td className="p-3">
                                        {d.type === 'kiosk' && d.is_active ? (
                                            <Switch checked={d.settings?.is_out_of_service ?? false} onCheckedChange={(v) => toggleService(d, v)} aria-label={`Out of service: ${d.name}`} />
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, device: d })}>
                                                Edit
                                            </Button>
                                            {d.is_active && (
                                                <Button variant="outline" size="sm" onClick={() => newCode(d)}>
                                                    {d.paired ? 'New code' : 'Get code'}
                                                </Button>
                                            )}
                                            {d.paired && (
                                                <Button variant="ghost" size="sm" onClick={() => signOut(d)}>
                                                    Sign out
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {devices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-muted-foreground p-8 text-center">
                                        No devices yet. Add your first kiosk to get a pairing code.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DeviceDialog open={dialog.open} device={dialog.device} stations={stations} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))} />
            <PairingDialog pairing={code} onClose={() => setCode(null)} />
        </>
    );
}

DevicesIndex.layout = {
    breadcrumbs: [
        { title: 'Kiosk', href: '/kiosk/devices' },
        { title: 'Devices', href: index() },
    ],
};
