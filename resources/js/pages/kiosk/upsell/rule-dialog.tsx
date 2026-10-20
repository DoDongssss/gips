import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';

import { Field, FormError } from '@/components/inventory/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { channelLabels, orNull } from '@/lib/kiosk';
import { destroy, store, update } from '@/routes/kiosk/upsell';
import type { NamedOption, UpsellRuleRow } from '@/types/kiosk';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; rule?: UpsellRuleRow; products: NamedOption[]; categories: NamedOption[] };

type FormData = {
    trigger_kind: 'product' | 'category';
    trigger_id: string;
    suggested_product_id: string;
    channel: UpsellRuleRow['channel'];
    message: string;
    priority: string;
    is_active: boolean;
};

const initial = (r?: UpsellRuleRow): FormData => ({
    trigger_kind: r?.trigger_kind ?? 'category',
    trigger_id: r ? String(r.trigger_product_id ?? r.trigger_category_id ?? '') : '',
    suggested_product_id: r ? String(r.suggested_product_id) : '',
    channel: r?.channel ?? 'kiosk',
    message: r?.message ?? '',
    priority: String(r?.priority ?? 10),
    is_active: r?.is_active ?? true,
});

export default function RuleDialog({ open, onOpenChange, rule, products, categories }: Props) {
    const form = useForm<FormData>(initial());
    const errors = form.errors as Record<string, string>;
    const triggers = form.data.trigger_kind === 'product' ? products : categories;

    useEffect(() => {
        if (open) {
            form.setData(initial(rule));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, rule?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            trigger_product_id: data.trigger_kind === 'product' && data.trigger_id ? Number(data.trigger_id) : null,
            trigger_category_id: data.trigger_kind === 'category' && data.trigger_id ? Number(data.trigger_id) : null,
            suggested_product_id: data.suggested_product_id ? Number(data.suggested_product_id) : null,
            channel: data.channel,
            message: orNull(data.message),
            priority: Number(data.priority || 0),
            is_active: data.is_active,
        }));

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (rule) {
            form.put(update.url(rule.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    function remove() {
        if (rule && confirm('Delete this rule?')) {
            form.delete(destroy.url(rule.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
        }
    }

    const triggerError = errors.trigger_product_id || errors.trigger_category_id;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{rule ? 'Edit rule' : 'New upsell rule'}</DialogTitle>
                        <DialogDescription>When the cart holds the trigger, the customer is offered the suggestion before paying.</DialogDescription>
                    </DialogHeader>

                    <FormError message={errors.error} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="up-kind" label="When the cart has">
                            <Select
                                value={form.data.trigger_kind}
                                onValueChange={(v) => form.setData((d) => ({ ...d, trigger_kind: v as FormData['trigger_kind'], trigger_id: '' }))}
                            >
                                <SelectTrigger id="up-kind">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="category">Anything from a category</SelectItem>
                                    <SelectItem value="product">A specific product</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field id="up-trigger" label={form.data.trigger_kind === 'product' ? 'Product' : 'Category'} error={triggerError}>
                            <Select value={form.data.trigger_id} onValueChange={(v) => form.setData('trigger_id', v)}>
                                <SelectTrigger id="up-trigger">
                                    <SelectValue placeholder="Choose" />
                                </SelectTrigger>
                                <SelectContent>
                                    {triggers.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field id="up-suggest" label="Offer this product" error={errors.suggested_product_id}>
                        <Select value={form.data.suggested_product_id} onValueChange={(v) => form.setData('suggested_product_id', v)}>
                            <SelectTrigger id="up-suggest">
                                <SelectValue placeholder="Choose a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field id="up-message" label="Message" error={errors.message} hint="Shown with the suggestion. Optional.">
                        <Input id="up-message" placeholder="Add a croissant for ₱65?" value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="up-channel" label="Where" error={errors.channel}>
                            <Select value={form.data.channel} onValueChange={(v) => form.setData('channel', v as FormData['channel'])}>
                                <SelectTrigger id="up-channel">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(channelLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field id="up-priority" label="Priority" error={errors.priority} hint="Higher shows first. Three suggestions at most.">
                            <Input id="up-priority" inputMode="numeric" value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)} />
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                        Rule is on
                    </label>

                    <DialogFooter className="sm:justify-between">
                        {rule ? (
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
