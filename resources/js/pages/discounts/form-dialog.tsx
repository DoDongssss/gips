import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { centsToPesos, pesosToCents } from '@/lib/money';
import { store, update } from '@/routes/discounts';

export type DiscountRecord = {
    id: number;
    name: string;
    code: string | null;
    type: 'percent' | 'fixed';
    /** Percent: basis points (2000 = 20%). Fixed: centavos. */
    value: number;
    applies_to: 'order' | 'item';
    requires_id: boolean;
    requires_approval: boolean;
    is_vat_exempt: boolean;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    discount?: DiscountRecord;
};

type FormData = {
    name: string;
    code: string;
    type: 'percent' | 'fixed';
    /** What the person types: a percent (20, 12.5) or pesos (50.00). Converted on submit. */
    value: string;
    applies_to: 'order' | 'item';
    requires_id: boolean;
    requires_approval: boolean;
    is_vat_exempt: boolean;
    is_active: boolean;
    starts_at: string;
    ends_at: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string from the server to the `datetime-local` input format, in the browser's time zone. */
function toLocalInput(value: string | null): string {
    if (!value) {
        return '';
    }

    const d = new Date(value);

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const blank: FormData = {
    name: '',
    code: '',
    type: 'percent',
    value: '',
    applies_to: 'order',
    requires_id: false,
    requires_approval: false,
    is_vat_exempt: false,
    is_active: true,
    starts_at: '',
    ends_at: '',
};

function fromRecord(discount?: DiscountRecord): FormData {
    if (!discount) {
        return blank;
    }

    return {
        name: discount.name,
        code: discount.code ?? '',
        type: discount.type,
        value: discount.type === 'percent' ? String(discount.value / 100) : centsToPesos(discount.value),
        applies_to: discount.applies_to,
        requires_id: discount.requires_id,
        requires_approval: discount.requires_approval,
        is_vat_exempt: discount.is_vat_exempt,
        is_active: discount.is_active,
        starts_at: toLocalInput(discount.starts_at),
        ends_at: toLocalInput(discount.ends_at),
    };
}

const toggles: { key: 'requires_id' | 'requires_approval' | 'is_vat_exempt' | 'is_active'; title: string; hint: string }[] = [
    { key: 'requires_id', title: 'Ask for the customer ID', hint: 'The cashier must type an ID number, for example a senior or PWD card.' },
    { key: 'requires_approval', title: 'Needs manager approval', hint: 'A cashier needs a manager PIN to place the order.' },
    { key: 'is_vat_exempt', title: 'VAT exempt', hint: 'Removes VAT before the discount is taken. Used for senior and PWD.' },
    { key: 'is_active', title: 'Available at the register', hint: 'Turn off instead of deleting, so old orders keep their link.' },
];

export default function DiscountFormDialog({ open, onOpenChange, mode, discount }: Props) {
    const isEdit = mode === 'edit' && discount !== undefined;
    const form = useForm<FormData>(blank);

    // Refill every time the dialog opens: blank for create, the row for edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData(fromRecord(isEdit ? discount : undefined));
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, discount?.id, mode]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            code: data.code.trim() === '' ? null : data.code.trim(),
            value: data.type === 'percent' ? Math.round((Number(data.value) || 0) * 100) : pesosToCents(data.value || '0'),
            starts_at: data.starts_at || null,
            ends_at: data.ends_at || null,
        }));

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (isEdit) {
            form.put(update.url(discount.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    const error = (key: keyof FormData) => form.errors[key] && <p className="text-destructive text-sm">{form.errors[key]}</p>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit discount' : 'New discount'}</DialogTitle>
                        <DialogDescription>Discounts are shown to cashiers at the register while they are active.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="discount-name">Name</Label>
                            <Input id="discount-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus />
                            {error('name')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount-code">Code (optional)</Label>
                            <Input id="discount-code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
                            {error('code')}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="discount-type">Type</Label>
                            <Select value={form.data.type} onValueChange={(value) => form.setData('type', value as FormData['type'])}>
                                <SelectTrigger id="discount-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">Percent</SelectItem>
                                    <SelectItem value="fixed">Fixed amount</SelectItem>
                                </SelectContent>
                            </Select>
                            {error('type')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount-value">{form.data.type === 'percent' ? 'Percent off' : 'Pesos off'}</Label>
                            <Input
                                id="discount-value"
                                inputMode="decimal"
                                placeholder={form.data.type === 'percent' ? '20' : '50.00'}
                                value={form.data.value}
                                onChange={(e) => form.setData('value', e.target.value)}
                            />
                            {error('value')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount-applies">Applies to</Label>
                            <Select value={form.data.applies_to} onValueChange={(value) => form.setData('applies_to', value as FormData['applies_to'])}>
                                <SelectTrigger id="discount-applies">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="order">Whole order</SelectItem>
                                    <SelectItem value="item">One item</SelectItem>
                                </SelectContent>
                            </Select>
                            {error('applies_to')}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {toggles.map((toggle) => (
                            <div key={toggle.key} className="flex items-center justify-between gap-4 rounded-md border p-3">
                                <div>
                                    <Label htmlFor={`discount-${toggle.key}`}>{toggle.title}</Label>
                                    <p className="text-muted-foreground text-sm">{toggle.hint}</p>
                                </div>
                                <Switch
                                    id={`discount-${toggle.key}`}
                                    checked={form.data[toggle.key]}
                                    onCheckedChange={(value) => form.setData(toggle.key, value)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="discount-starts">Starts (optional)</Label>
                            <Input id="discount-starts" type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} />
                            {error('starts_at')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount-ends">Ends (optional)</Label>
                            <Input id="discount-ends" type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} />
                            {error('ends_at')}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save changes' : 'Create discount'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
