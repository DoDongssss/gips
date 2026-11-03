import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { destroy, store, update } from '@/routes/inventory/suppliers';
import type { Supplier } from '@/types/inventory';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; supplier?: Supplier; onDeleted?: () => void };

type FormData = { name: string; contact_person: string; phone: string; email: string; address: string; notes: string; is_active: boolean };

const initial = (s?: Supplier): FormData => ({
    name: s?.name ?? '',
    contact_person: s?.contact_person ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    address: s?.address ?? '',
    notes: s?.notes ?? '',
    is_active: s?.is_active ?? true,
});

const textareaClass =
    'border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function SupplierDialog({ open, onOpenChange, supplier, onDeleted }: Props) {
    const form = useForm<FormData>(initial());
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.setData(initial(supplier));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, supplier?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            contact_person: data.contact_person.trim() || null,
            phone: data.phone.trim() || null,
            email: data.email.trim() || null,
            address: data.address.trim() || null,
            notes: data.notes.trim() || null,
        }));

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (supplier) {
            form.put(update.url(supplier.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    function remove() {
        if (supplier && confirm(`Remove "${supplier.name}"? Past purchase orders keep the name.`)) {
            form.delete(destroy.url(supplier.id), {
                onSuccess: () => {
                    onOpenChange(false);
                    onDeleted?.();
                },
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{supplier ? 'Edit supplier' : 'New supplier'}</DialogTitle>
                        <DialogDescription>Who you buy ingredients from.</DialogDescription>
                    </DialogHeader>

                    <Field id="sup-name" label="Name" error={errors.name}>
                        <Input id="sup-name" autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="sup-contact" label="Contact person" error={errors.contact_person}>
                            <Input id="sup-contact" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                        </Field>
                        <Field id="sup-phone" label="Phone" error={errors.phone}>
                            <Input id="sup-phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                        </Field>
                    </div>

                    <Field id="sup-email" label="Email" error={errors.email}>
                        <Input id="sup-email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    </Field>

                    <Field id="sup-address" label="Address" error={errors.address}>
                        <textarea id="sup-address" className={textareaClass} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                    </Field>

                    <Field id="sup-notes" label="Notes" error={errors.notes}>
                        <textarea id="sup-notes" className={textareaClass} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </Field>

                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.data.is_active} onCheckedChange={(value) => form.setData('is_active', value)} />
                        Active (can be chosen on new purchase orders)
                    </label>

                    <DialogFooter className="sm:justify-between">
                        {supplier ? (
                            <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
                                Remove
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save supplier'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
