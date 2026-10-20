import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field, FormError } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { deviceTypeLabels, orNull } from '@/lib/kiosk';
import { destroy, store, update } from '@/routes/kiosk/devices';
import type { DeviceRow, Station } from '@/types/kiosk';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; device?: DeviceRow; stations: Station[] };

type FormData = {
    name: string;
    type: 'kiosk' | 'pos' | 'kds';
    station_id: string;
    is_active: boolean;
    idle_timeout_seconds: string;
    welcome_message: string;
    upsell_enabled: boolean;
    large_text: boolean;
    is_out_of_service: boolean;
};

const NONE = 'none';

const initial = (d?: DeviceRow): FormData => ({
    name: d?.name ?? '',
    type: d?.type ?? 'kiosk',
    station_id: d?.station_id ? String(d.station_id) : NONE,
    is_active: d?.is_active ?? true,
    idle_timeout_seconds: String(d?.settings?.idle_timeout_seconds ?? 60),
    welcome_message: d?.settings?.welcome_message ?? '',
    upsell_enabled: d?.settings?.upsell_enabled ?? true,
    large_text: d?.settings?.large_text ?? false,
    is_out_of_service: d?.settings?.is_out_of_service ?? false,
});

export default function DeviceDialog({ open, onOpenChange, device, stations }: Props) {
    const form = useForm<FormData>(initial());
    const errors = form.errors as Record<string, string>;
    const isKiosk = (device?.type ?? form.data.type) === 'kiosk';

    useEffect(() => {
        if (open) {
            form.setData(initial(device));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, device?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => {
            const base = { name: data.name, station_id: data.station_id === NONE ? null : Number(data.station_id) };

            if (!device) {
                return { ...base, type: data.type };
            }

            return {
                ...base,
                is_active: data.is_active,
                ...(isKiosk && {
                    settings: {
                        idle_timeout_seconds: Number(data.idle_timeout_seconds || 60),
                        welcome_message: orNull(data.welcome_message),
                        upsell_enabled: data.upsell_enabled,
                        large_text: data.large_text,
                        is_out_of_service: data.is_out_of_service,
                    },
                }),
            };
        });

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (device) {
            form.put(update.url(device.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    function remove() {
        if (device && confirm(`Delete "${device.name}"? A device with orders on record cannot be deleted; switch it off instead.`)) {
            form.delete(destroy.url(device.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{device ? 'Edit device' : 'Add a device'}</DialogTitle>
                        <DialogDescription>{device ? 'Changes reach the tablet within about 15 seconds.' : 'You get a one-time pairing code to enter on the tablet.'}</DialogDescription>
                    </DialogHeader>

                    <FormError message={errors.error} />

                    <Field id="dev-name" label="Name" error={errors.name} hint="For example: Front counter kiosk">
                        <Input id="dev-name" autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </Field>

                    {!device && (
                        <Field id="dev-type" label="Type" error={errors.type}>
                            <Select value={form.data.type} onValueChange={(v) => form.setData('type', v as FormData['type'])}>
                                <SelectTrigger id="dev-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(deviceTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}

                    {(device?.type ?? form.data.type) === 'kds' && (
                        <Field id="dev-station" label="Station" error={errors.station_id}>
                            <Select value={form.data.station_id} onValueChange={(v) => form.setData('station_id', v)}>
                                <SelectTrigger id="dev-station">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>All stations</SelectItem>
                                    {stations.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}

                    {device && isKiosk && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <p className="text-sm font-medium">Kiosk settings</p>

                            <label className="flex items-center justify-between gap-3 text-sm">
                                <span>
                                    Out of service
                                    <span className="text-muted-foreground block text-xs">Shows an "out of service" screen and refuses orders.</span>
                                </span>
                                <Switch checked={form.data.is_out_of_service} onCheckedChange={(v) => form.setData('is_out_of_service', v)} />
                            </label>

                            <Field id="dev-idle" label="Idle reset (seconds)" error={errors['settings.idle_timeout_seconds']} hint="Returns to the welcome screen after this long with no touch. 15 to 600.">
                                <Input id="dev-idle" inputMode="numeric" value={form.data.idle_timeout_seconds} onChange={(e) => form.setData('idle_timeout_seconds', e.target.value)} />
                            </Field>

                            <Field id="dev-welcome" label="Welcome message" error={errors['settings.welcome_message']}>
                                <Input id="dev-welcome" placeholder="Welcome! Tap to order" value={form.data.welcome_message} onChange={(e) => form.setData('welcome_message', e.target.value)} />
                            </Field>

                            <label className="flex items-center justify-between gap-3 text-sm">
                                <span>Suggest add-ons before checkout</span>
                                <Switch checked={form.data.upsell_enabled} onCheckedChange={(v) => form.setData('upsell_enabled', v)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-sm">
                                <span>Large text</span>
                                <Switch checked={form.data.large_text} onCheckedChange={(v) => form.setData('large_text', v)} />
                            </label>
                            <p className="text-muted-foreground text-xs">Payment: pay at the counter. The customer gets a pickup number and pays the cashier.</p>
                        </div>
                    )}

                    {device && (
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span>
                                Device is on
                                <span className="text-muted-foreground block text-xs">Switching it off signs the tablet out immediately.</span>
                            </span>
                            <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                        </label>
                    )}

                    <DialogFooter className="sm:justify-between">
                        {device ? (
                            <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
                                Delete
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {device ? 'Save' : 'Add and get code'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
