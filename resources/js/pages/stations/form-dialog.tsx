import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Switch } from '@/components/ui/switch';
import { store, update } from '@/routes/stations';

export type StationRecord = {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
    sort_order: number;
    category_ids: number[];
};

export type StationCategory = { id: number; name: string; station_id: number | null };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    station?: StationRecord;
    stations: StationRecord[];
    categories: StationCategory[];
};

type FormData = {
    name: string;
    type: string;
    is_active: boolean;
    sort_order: string;
    category_ids: number[];
};

const TYPES = [
    { value: 'bar', label: 'Bar' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'pastry', label: 'Pastry' },
    { value: 'other', label: 'Other' },
];

const blank: FormData = { name: '', type: 'kitchen', is_active: true, sort_order: '0', category_ids: [] };

export default function StationFormDialog({ open, onOpenChange, mode, station, stations, categories }: Props) {
    const isEdit = mode === 'edit' && station !== undefined;
    const form = useForm<FormData>(blank);

    // Refill every time the dialog opens: blank for create, the row for edit.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData(
            isEdit
                ? {
                      name: station.name,
                      type: station.type,
                      is_active: station.is_active,
                      sort_order: String(station.sort_order),
                      category_ids: station.category_ids,
                  }
                : blank,
        );
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, station?.id, mode]);

    function toggleCategory(id: number, checked: boolean) {
        form.setData(
            'category_ids',
            checked ? [...form.data.category_ids, id] : form.data.category_ids.filter((current) => current !== id),
        );
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (isEdit) {
            form.put(update.url(station.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    const stationName = (id: number | null) => stations.find((s) => s.id === id)?.name;
    const error = (key: keyof FormData) =>
        form.errors[key] && <p className="text-destructive text-sm">{form.errors[key]}</p>;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit station' : 'New station'}</DialogTitle>
                        <DialogDescription>
                            Tickets for a product go to its own station, otherwise to its category&apos;s station.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="station-name">Name</Label>
                            <Input
                                id="station-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                autoFocus
                            />
                            {error('name')}
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.data.type} onValueChange={(value) => form.setData('type', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {error('type')}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="station-sort">Sort order</Label>
                            <Input
                                id="station-sort"
                                inputMode="numeric"
                                value={form.data.sort_order}
                                onChange={(e) => form.setData('sort_order', e.target.value)}
                            />
                            {error('sort_order')}
                        </div>
                        <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
                            <span>
                                Active
                                <span className="text-muted-foreground block">
                                    Inactive stations get no new tickets.
                                </span>
                            </span>
                            <Switch
                                checked={form.data.is_active}
                                onCheckedChange={(value) => form.setData('is_active', value)}
                            />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label>Categories prepared here</Label>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                            {categories.length === 0 && (
                                <p className="text-muted-foreground p-2 text-sm">No categories yet.</p>
                            )}
                            {categories.map((category) => {
                                const elsewhere =
                                    category.station_id && category.station_id !== station?.id
                                        ? stationName(category.station_id)
                                        : null;

                                return (
                                    <label
                                        key={category.id}
                                        className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm"
                                    >
                                        <Checkbox
                                            checked={form.data.category_ids.includes(category.id)}
                                            onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                                        />
                                        <span className="flex-1">{category.name}</span>
                                        {elsewhere && (
                                            <span className="text-muted-foreground text-xs">now at {elsewhere}</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                        {error('category_ids')}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save changes' : 'Create station'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
