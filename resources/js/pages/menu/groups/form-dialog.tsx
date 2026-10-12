import { useForm } from '@inertiajs/react';
import { Plus, Star, X } from 'lucide-react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { centsToPesos, pesosToCents } from '@/lib/money';
import { store, update } from '@/routes/menu/groups';

export type ModifierRecord = {
    id: number;
    name: string;
    price_delta_cents: number;
    is_default: boolean;
    is_available: boolean;
};

export type GroupRecord = {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: number;
    max_select: number | null;
    is_active: boolean;
    sort_order: number;
    products_count: number;
    modifiers: ModifierRecord[];
};

type Row = { id?: number; name: string; price: string; is_default: boolean; is_available: boolean };

type FormData = {
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    min_select: string;
    max_select: string;
    is_active: boolean;
    modifiers: Row[];
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    group?: GroupRecord;
};

const blankRow = (): Row => ({ name: '', price: '0.00', is_default: false, is_available: true });

function initialData(group?: GroupRecord): FormData {
    return {
        name: group?.name ?? '',
        selection_type: group?.selection_type ?? 'single',
        is_required: group?.is_required ?? false,
        min_select: String(group?.min_select ?? 0),
        max_select: group?.max_select != null ? String(group.max_select) : '',
        is_active: group?.is_active ?? true,
        modifiers: group
            ? group.modifiers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: centsToPesos(m.price_delta_cents),
                  is_default: m.is_default,
                  is_available: m.is_available,
              }))
            : [blankRow()],
    };
}

export default function GroupFormDialog({ open, onOpenChange, mode, group }: Props) {
    const isEdit = mode === 'edit' && group !== undefined;

    const form = useForm<FormData>(initialData());
    const errors = form.errors as Record<string, string>;
    const multiple = form.data.selection_type === 'multiple';

    // Refill every time the dialog opens: blank for create, the row for edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData(initialData(isEdit ? group : undefined));
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, group?.id, mode]);

    const setRows = (rows: Row[]) => form.setData('modifiers', rows);
    const patch = (index: number, change: Partial<Row>) =>
        setRows(form.data.modifiers.map((row, i) => (i === index ? { ...row, ...change } : row)));

    // In a single-choice group only one option can be the default.
    const toggleDefault = (index: number) =>
        setRows(
            form.data.modifiers.map((row, i) => ({
                ...row,
                is_default: i === index ? !row.is_default : multiple ? row.is_default : false,
            })),
        );

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            name: data.name,
            selection_type: data.selection_type,
            is_required: data.is_required,
            min_select: multiple ? Number(data.min_select || 0) : null,
            max_select: multiple && data.max_select !== '' ? Number(data.max_select) : null,
            is_active: data.is_active,
            modifiers: data.modifiers.map((row) => ({
                id: row.id ?? null,
                name: row.name,
                price_delta_cents: pesosToCents(row.price),
                is_default: row.is_default,
                is_available: row.is_available,
            })),
        }));

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (isEdit) {
            form.put(update.url(group.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit modifier group' : 'New modifier group'}</DialogTitle>
                        <DialogDescription>Milk choices, extra shots, syrups. Attach groups to products from the product page.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group name</Label>
                            <Input
                                id="group-name"
                                placeholder="e.g. Milk"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                autoFocus
                            />
                            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Customer can pick</Label>
                            <Select
                                value={form.data.selection_type}
                                onValueChange={(value) => form.setData('selection_type', value as 'single' | 'multiple')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">One option</SelectItem>
                                    <SelectItem value="multiple">Several options</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <Switch checked={form.data.is_required} onCheckedChange={(value) => form.setData('is_required', value)} />
                            Required
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <Switch checked={form.data.is_active} onCheckedChange={(value) => form.setData('is_active', value)} />
                            Show on POS and kiosk
                        </label>
                    </div>

                    {multiple && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="group-min">Minimum choices</Label>
                                <Input
                                    id="group-min"
                                    inputMode="numeric"
                                    value={form.data.min_select}
                                    onChange={(event) => form.setData('min_select', event.target.value)}
                                />
                                {errors.min_select && <p className="text-destructive text-sm">{errors.min_select}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="group-max">Maximum choices (blank = any)</Label>
                                <Input
                                    id="group-max"
                                    inputMode="numeric"
                                    value={form.data.max_select}
                                    onChange={(event) => form.setData('max_select', event.target.value)}
                                />
                                {errors.max_select && <p className="text-destructive text-sm">{errors.max_select}</p>}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Options</Label>

                        {form.data.modifiers.map((row, index) => (
                            <div key={row.id ?? `new-${index}`} className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                    <Input
                                        className="min-w-32 flex-1"
                                        placeholder="Option name"
                                        aria-label="Option name"
                                        value={row.name}
                                        onChange={(event) => patch(index, { name: event.target.value })}
                                    />
                                    <Input
                                        className="w-28"
                                        inputMode="decimal"
                                        placeholder="± ₱"
                                        aria-label="Price change in pesos"
                                        value={row.price}
                                        onChange={(event) => patch(index, { price: event.target.value })}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={row.is_default ? 'default' : 'outline'}
                                        onClick={() => toggleDefault(index)}
                                    >
                                        <Star className="size-3.5" /> Default
                                    </Button>
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch checked={row.is_available} onCheckedChange={(value) => patch(index, { is_available: value })} />
                                        In stock
                                    </label>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Remove option"
                                        disabled={form.data.modifiers.length === 1}
                                        onClick={() => setRows(form.data.modifiers.filter((_, i) => i !== index))}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                                {errors[`modifiers.${index}.name`] && (
                                    <p className="text-destructive text-sm">{errors[`modifiers.${index}.name`]}</p>
                                )}
                            </div>
                        ))}

                        {errors.modifiers && <p className="text-destructive text-sm">{errors.modifiers}</p>}

                        <Button type="button" variant="outline" size="sm" onClick={() => setRows([...form.data.modifiers, blankRow()])}>
                            <Plus className="size-4" /> Add option
                        </Button>
                        <p className="text-muted-foreground text-xs">
                            Price change is added to the product price. Use a negative number for a discount, for example -5.00.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save group' : 'Create group'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}