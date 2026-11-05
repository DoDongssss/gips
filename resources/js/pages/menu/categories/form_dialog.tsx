import { useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { store, update } from '@/routes/menu/categories';
import type { Option } from '@/types/menu';

export type CategoryRecord = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    products_count: number;
    station_id: number | null;
    station_name: string | null;
    image_url: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    category?: CategoryRecord;
    stations: Option[];
};

const NONE = 'none';

export default function CategoryFormDialog({ open, onOpenChange, mode, category, stations }: Props) {
    const isEdit = mode === 'edit' && category !== undefined;
    const fileInput = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '',
        description: '',
        is_active: true,
        station_id: NONE,
        image: null as File | null,
        remove_image: false,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: category?.name ?? '',
            description: category?.description ?? '',
            is_active: category?.is_active ?? true,
            station_id: category?.station_id ? String(category.station_id) : NONE,
            image: null,
            remove_image: false,
        });
        form.clearErrors();

        if (fileInput.current) {
            fileInput.current.value = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, category?.id, mode]);

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => onOpenChange(false),
        };

        const payload = {
            name: form.data.name,
            description: form.data.description || null,
            is_active: form.data.is_active,
            station_id: form.data.station_id === NONE ? null : form.data.station_id,
            image: form.data.image,
            remove_image: form.data.remove_image,
        };

        if (isEdit) {
            form.transform(() => ({ ...payload, _method: 'put' }));
            form.post(update.url(category.id), options);
        } else {
            form.transform(() => payload);
            form.post(store.url(), options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
                        <DialogDescription>Categories group products on the POS and kiosk. Order is set with the arrows on the list.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="category-name">Name</Label>
                        <Input id="category-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} autoFocus />
                        {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category-description">Description (optional)</Label>
                        <Textarea
                            id="category-description"
                            rows={2}
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                        />
                        {form.errors.description && <p className="text-destructive text-sm">{form.errors.description}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Kitchen station</Label>
                        <Select value={form.data.station_id} onValueChange={(value) => form.setData('station_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a station" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Unassigned</SelectItem>
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={String(station.id)}>
                                        {station.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">Tickets for products in this category go here unless a product overrides it.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Category image (optional)</Label>
                        {isEdit && category?.image_url && !form.data.remove_image && (
                            <img src={category.image_url} alt="" className="mb-2 h-24 w-full rounded-md object-cover" />
                        )}
                        <Input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)} />
                        {isEdit && category?.image_url && (
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.data.remove_image} onChange={(e) => form.setData('remove_image', e.target.checked)} />
                                Remove current image
                            </label>
                        )}
                        {(form.errors as Record<string, string>).image && (
                            <p className="text-destructive text-sm">{(form.errors as Record<string, string>).image}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <Label htmlFor="category-active">Show on POS and kiosk</Label>
                            <p className="text-muted-foreground text-sm">Turn off to hide the whole category.</p>
                        </div>
                        <Switch id="category-active" checked={form.data.is_active} onCheckedChange={(value) => form.setData('is_active', value)} />
                    </div>

                    {isEdit && category && (
                        <p className="text-muted-foreground text-xs">
                            URL slug: <span className="font-mono">{category.slug}</span>
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Save changes' : 'Create category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
