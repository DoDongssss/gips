import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, update } from '@/routes/inventory/units';
import type { Unit, UnitType } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; unit?: Unit };

const typeLabels: Record<UnitType, string> = { weight: 'Weight (g, kg)', volume: 'Volume (ml, l)', count: 'Count (pc, bottle, box)' };

export default function UnitDialog({ open, onOpenChange, unit }: Props) {
    const form = useForm<{ name: string; abbreviation: string; type: UnitType }>({ name: '', abbreviation: '', type: 'weight' });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({ name: unit?.name ?? '', abbreviation: unit?.abbreviation ?? '', type: unit?.type ?? 'weight' });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, unit?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (unit) {
            form.put(update.url(unit.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{unit ? 'Edit unit' : 'New unit'}</DialogTitle>
                        <DialogDescription>Units are what stock and recipes are measured in.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="unit-name" label="Name" error={errors.name}>
                            <Input id="unit-name" placeholder="e.g. Kilogram" autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        </Field>
                        <Field id="unit-abbr" label="Abbreviation" error={errors.abbreviation}>
                            <Input id="unit-abbr" placeholder="e.g. kg" value={form.data.abbreviation} onChange={(e) => form.setData('abbreviation', e.target.value)} />
                        </Field>
                    </div>

                    <Field id="unit-type" label="Measures" error={errors.type}>
                        <Select value={form.data.type} onValueChange={(value) => form.setData('type', value as UnitType)}>
                            <SelectTrigger id="unit-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(typeLabels) as UnitType[]).map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {typeLabels[type]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save unit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
