import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store } from '@/routes/inventory/conversions';
import type { Unit } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; units: Unit[] };

/** "1 [from] = [factor] [to]". Only one direction is stored; the reverse is worked out automatically. */
export default function ConversionDialog({ open, onOpenChange, units }: Props) {
    const form = useForm({ from_unit_id: '', to_unit_id: '', factor: '' });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const from = units.find((u) => String(u.id) === form.data.from_unit_id);
    const to = units.find((u) => String(u.id) === form.data.to_unit_id);

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(store.url(), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>New conversion</DialogTitle>
                        <DialogDescription>
                            Teach the system how units relate, for example 1 kg = 1000 g or 1 bottle = 750 ml. The other direction is automatic.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="conv-from" label="From (1 of)" error={errors.from_unit_id}>
                            <Select value={form.data.from_unit_id} onValueChange={(value) => form.setData('from_unit_id', value)}>
                                <SelectTrigger id="conv-from">
                                    <SelectValue placeholder="Choose a unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={String(unit.id)}>
                                            {unit.name} ({unit.abbreviation})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field id="conv-to" label="Equals, in" error={errors.to_unit_id}>
                            <Select value={form.data.to_unit_id} onValueChange={(value) => form.setData('to_unit_id', value)}>
                                <SelectTrigger id="conv-to">
                                    <SelectValue placeholder="Choose a unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={String(unit.id)}>
                                            {unit.name} ({unit.abbreviation})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field id="conv-factor" label="How many?" error={errors.factor} hint={from && to ? `1 ${from.abbreviation} = ? ${to.abbreviation}` : undefined}>
                        <Input id="conv-factor" inputMode="decimal" placeholder="e.g. 1000" value={form.data.factor} onChange={(e) => form.setData('factor', e.target.value)} />
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save conversion'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
