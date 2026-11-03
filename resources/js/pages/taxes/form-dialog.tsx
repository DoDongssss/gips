import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { store, update } from '@/routes/taxes';

export type TaxRecord = {
    id: number;
    name: string;
    /** 12 means 12%. */
    rate_percent: number;
    is_inclusive: boolean;
    is_default: boolean;
    is_active: boolean;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    tax?: TaxRecord;
};

type FormData = {
    name: string;
    rate_percent: string;
    is_inclusive: boolean;
    is_default: boolean;
    is_active: boolean;
};

const blank: FormData = { name: '', rate_percent: '', is_inclusive: true, is_default: false, is_active: true };

function fromRecord(tax?: TaxRecord): FormData {
    if (!tax) {
        return blank;
    }

    return {
        name: tax.name,
        rate_percent: String(tax.rate_percent),
        is_inclusive: tax.is_inclusive,
        is_default: tax.is_default,
        is_active: tax.is_active,
    };
}

const toggles: { key: 'is_inclusive' | 'is_default' | 'is_active'; title: string; hint: string }[] = [
    { key: 'is_inclusive', title: 'Menu prices already include this tax', hint: 'Off means the tax is added on top of the menu price.' },
    { key: 'is_default', title: 'Default tax', hint: 'Applied to every taxable item. Only one tax can be the default.' },
    { key: 'is_active', title: 'Active', hint: 'Turn off instead of deleting, so old orders keep their link.' },
];

export default function TaxFormDialog({ open, onOpenChange, mode, tax }: Props) {
    const isEdit = mode === 'edit' && tax !== undefined;
    const form = useForm<FormData>(blank);

    // Refill every time the dialog opens: blank for create, the row for edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData(fromRecord(isEdit ? tax : undefined));
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tax?.id, mode]);

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (isEdit) {
            form.put(update.url(tax.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    const error = (key: keyof FormData) => form.errors[key] && <p className="text-destructive text-sm">{form.errors[key]}</p>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit tax' : 'New tax'}</DialogTitle>
                        <DialogDescription>Changes apply to new orders only. Confirm the rate with your accountant.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="tax-name">Name</Label>
                            <Input id="tax-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus />
                            {error('name')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-rate">Rate (%)</Label>
                            <Input
                                id="tax-rate"
                                inputMode="decimal"
                                placeholder="12"
                                value={form.data.rate_percent}
                                onChange={(e) => form.setData('rate_percent', e.target.value)}
                            />
                            {error('rate_percent')}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {toggles.map((toggle) => (
                            <div key={toggle.key} className="flex items-center justify-between gap-4 rounded-md border p-3">
                                <div>
                                    <Label htmlFor={`tax-${toggle.key}`}>{toggle.title}</Label>
                                    <p className="text-muted-foreground text-sm">{toggle.hint}</p>
                                </div>
                                <Switch id={`tax-${toggle.key}`} checked={form.data[toggle.key]} onCheckedChange={(value) => form.setData(toggle.key, value)} />
                            </div>
                        ))}
                        {error('is_default')}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save changes' : 'Create tax'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
