import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, update } from '@/routes/devices';

export type DeviceRecord = {
    id: number;
    name: string;
    station_id: number | null;
    station_name: string | null;
    is_active: boolean;
    is_paired: boolean;
    paired_at: string | null;
    last_seen_at: string | null;
    ip_address: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    device?: DeviceRecord;
    stations: { id: number; name: string }[];
};

type FormData = { name: string; station_id: string };

export default function DeviceFormDialog({ open, onOpenChange, device, stations }: Props) {
    const form = useForm<FormData>({ name: '', station_id: '' });

    // Refill every time the dialog opens: blank for a new screen, the row for an edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({ name: device?.name ?? '', station_id: device?.station_id ? String(device.station_id) : '' });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, device?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (device) {
            form.put(update.url(device.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{device ? 'Edit kitchen screen' : 'New kitchen screen'}</DialogTitle>
                        <DialogDescription>
                            {device
                                ? 'Moving a screen to another station takes effect on its next refresh.'
                                : 'You get a pairing code to enter on the tablet.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="device-name">Name</Label>
                        <Input
                            id="device-name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="Bar tablet"
                            autoFocus
                        />
                        {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Station</Label>
                        <Select
                            value={form.data.station_id}
                            onValueChange={(value) => form.setData('station_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a station" />
                            </SelectTrigger>
                            <SelectContent>
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={String(station.id)}>
                                        {station.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.errors.station_id && <p className="text-destructive text-sm">{form.errors.station_id}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {device ? 'Save changes' : 'Create screen'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
