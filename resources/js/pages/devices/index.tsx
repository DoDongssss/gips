import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DeviceFormDialog from '@/pages/devices/form-dialog';
import type { DeviceRecord } from '@/pages/devices/form-dialog';
import { index, resetPairing, update } from '@/routes/devices';

type Props = {
    devices: DeviceRecord[];
    stations: { id: number; name: string }[];
    pairing?: { device: string; code: string } | null;
};

type DialogState = { open: boolean; device?: DeviceRecord };

const seen = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Never';

export default function Index({ devices, stations, pairing }: Props) {
    const [dialog, setDialog] = useState<DialogState>({ open: false });
    const [code, setCode] = useState<{ device: string; code: string } | null>(null);

    // The code arrives once in the page props; keep it on screen until the owner closes it.
    useEffect(() => {
        if (pairing) {
            setCode(pairing);
        }
    }, [pairing]);

    const screenUrl = `${window.location.origin}/kitchen-screen`;

    function toggle(device: DeviceRecord) {
        router.put(
            update.url(device.id),
            { name: device.name, station_id: device.station_id, is_active: !device.is_active },
            { preserveScroll: true },
        );
    }

    function reset(device: DeviceRecord) {
        if (window.confirm(`Sign "${device.name}" out and make a new pairing code?`)) {
            router.post(resetPairing.url(device.id), {}, { preserveScroll: true });
        }
    }

    return (
        <>
            <Head title="Devices" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
                        <p className="text-muted-foreground text-sm">
                            Kitchen tablets sign in without a staff login. On the tablet open{' '}
                            <span className="font-mono">{screenUrl}</span> and enter the code.
                        </p>
                    </div>

                    <Can permission="setting.update">
                        <Button onClick={() => setDialog({ open: true, device: undefined })}>Add kitchen screen</Button>
                    </Can>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last seen</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {devices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                        No kitchen screens yet. Staff can still open the kitchen display after signing
                                        in.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                devices.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-medium">{device.name}</TableCell>
                                        <TableCell>{device.station_name ?? 'None'}</TableCell>
                                        <TableCell>
                                            {!device.is_active ? (
                                                <Badge variant="secondary">Off</Badge>
                                            ) : device.is_paired ? (
                                                <Badge>Paired</Badge>
                                            ) : (
                                                <Badge variant="outline">Waiting for code</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {seen(device.last_seen_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Can permission="setting.update">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDialog({ open: true, device })}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => reset(device)}>
                                                        New code
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => toggle(device)}>
                                                        {device.is_active ? 'Switch off' : 'Switch on'}
                                                    </Button>
                                                </div>
                                            </Can>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <DeviceFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                device={dialog.device}
                stations={stations}
            />

            <Dialog open={code !== null} onOpenChange={(open) => !open && setCode(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Pairing code for {code?.device}</DialogTitle>
                        <DialogDescription>
                            Enter this on the tablet within 24 hours. It is shown only once.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="py-4 text-center font-mono text-5xl font-semibold tracking-[0.3em]">{code?.code}</p>
                    <DialogFooter>
                        <Button onClick={() => setCode(null)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Devices', href: index() }],
};
