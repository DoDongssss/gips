import { useForm } from '@inertiajs/react';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';

import { Field, FormError } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { orNull, screenTypeLabels } from '@/lib/kiosk';
import { destroy, store, update } from '@/routes/kiosk/screens';
import type { ScreenRow } from '@/types/kiosk';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; screen?: ScreenRow };

type FormData = {
    title: string;
    type: ScreenRow['type'];
    headline: string;
    subtext: string;
    image: File | null;
    remove_image: boolean;
    sort_order: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
};

const initial = (s?: ScreenRow): FormData => ({
    title: s?.title ?? '',
    type: s?.type ?? 'promo',
    headline: s?.headline ?? '',
    subtext: s?.subtext ?? '',
    image: null,
    remove_image: false,
    sort_order: String(s?.sort_order ?? 0),
    starts_at: s?.starts_at ?? '',
    ends_at: s?.ends_at ?? '',
    is_active: s?.is_active ?? true,
});

export default function ScreenDialog({ open, onOpenChange, screen }: Props) {
    const form = useForm<FormData>(initial());
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (open) {
            form.setData(initial(screen));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, screen?.id]);

    // What the picture will look like: a newly chosen file wins over the saved one.
    const preview = useMemo(() => {
        if (form.data.image) return URL.createObjectURL(form.data.image);

        return form.data.remove_image ? null : (screen?.image_url ?? null);
    }, [form.data.image, form.data.remove_image, screen?.image_url]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            title: data.title,
            type: data.type,
            headline: orNull(data.headline),
            subtext: orNull(data.subtext),
            sort_order: Number(data.sort_order || 0),
            starts_at: orNull(data.starts_at),
            ends_at: orNull(data.ends_at),
            is_active: data.is_active,
            ...(data.image && { image: data.image }),
            ...(screen && { remove_image: data.remove_image, _method: 'put' }),
        }));

        // A file cannot travel in a PUT, so edits are posted as a multipart form with _method=put.
        const options = { preserveScroll: true, forceFormData: true, onSuccess: () => onOpenChange(false) };

        form.post(screen ? update.url(screen.id) : store.url(), options);
    }

    function remove() {
        if (screen && confirm(`Delete "${screen.title}"?`)) {
            form.delete(destroy.url(screen.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{screen ? 'Edit screen' : 'New welcome screen'}</DialogTitle>
                        <DialogDescription>Shown on the kiosk while nobody is ordering. Several screens rotate.</DialogDescription>
                    </DialogHeader>

                    <FormError message={errors.error} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="scr-title" label="Title" error={errors.title} hint="Only you see this.">
                            <Input id="scr-title" autoFocus value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                        </Field>
                        <Field id="scr-type" label="Kind" error={errors.type}>
                            <Select value={form.data.type} onValueChange={(v) => form.setData('type', v as FormData['type'])}>
                                <SelectTrigger id="scr-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(screenTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field id="scr-headline" label="Headline" error={errors.headline}>
                        <Input id="scr-headline" placeholder="Iced coffee, buy 1 get 1" value={form.data.headline} onChange={(e) => form.setData('headline', e.target.value)} />
                    </Field>
                    <Field id="scr-sub" label="Small text" error={errors.subtext}>
                        <Input id="scr-sub" placeholder="Every Friday, all day" value={form.data.subtext} onChange={(e) => form.setData('subtext', e.target.value)} />
                    </Field>

                    <Field id="scr-image" label="Picture" error={errors.image} hint="Landscape works best. JPG or PNG, up to 4 MB.">
                        {preview ? (
                            <div className="relative overflow-hidden rounded-lg border">
                                <img src={preview} alt="" className="aspect-video w-full object-cover" />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="absolute top-2 right-2 size-7"
                                    aria-label="Remove picture"
                                    onClick={() => form.setData((d) => ({ ...d, image: null, remove_image: true }))}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        ) : (
                            <label className="text-muted-foreground hover:bg-muted flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm">
                                <ImagePlus className="size-6" />
                                Choose a picture
                                <input
                                    id="scr-image"
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => form.setData((d) => ({ ...d, image: e.target.files?.[0] ?? null, remove_image: false }))}
                                />
                            </label>
                        )}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="scr-start" label="Starts" error={errors.starts_at} hint="Empty = already started.">
                            <Input id="scr-start" type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} />
                        </Field>
                        <Field id="scr-end" label="Ends" error={errors.ends_at} hint="Empty = never ends.">
                            <Input id="scr-end" type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid items-end gap-4 sm:grid-cols-2">
                        <Field id="scr-order" label="Order" error={errors.sort_order} hint="Lower numbers show first.">
                            <Input id="scr-order" inputMode="numeric" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                        </Field>
                        <label className="flex items-center gap-2 pb-6 text-sm">
                            <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                            Show on kiosks
                        </label>
                    </div>

                    <DialogFooter className="sm:justify-between">
                        {screen ? (
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
                                Save
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
