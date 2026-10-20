import { Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { channelLabels } from '@/lib/kiosk';
import RuleDialog from '@/pages/kiosk/upsell/rule-dialog';
import { index } from '@/routes/kiosk/upsell';
import type { NamedOption, UpsellRuleRow } from '@/types/kiosk';

type Props = { rules: UpsellRuleRow[]; products: NamedOption[]; categories: NamedOption[] };

export default function UpsellIndex({ rules, products, categories }: Props) {
    const [dialog, setDialog] = useState<{ open: boolean; rule?: UpsellRuleRow }>({ open: false });

    return (
        <>
            <Head title="Upsell rules" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Upsell rules</h1>
                        <p className="text-muted-foreground text-sm">The "add a pastry?" step. A customer sees at most three suggestions, highest priority first, never something already in the cart.</p>
                    </div>
                    <Button onClick={() => setDialog({ open: true })}>Add rule</Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">When the cart has</th>
                                <th className="p-3 font-medium">Offer</th>
                                <th className="p-3 font-medium">Message</th>
                                <th className="p-3 font-medium">Where</th>
                                <th className="p-3 text-right font-medium">Priority</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="w-20 p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((r) => (
                                <tr key={r.id} className="border-b last:border-0">
                                    <td className="p-3">
                                        <span className="font-medium">{r.trigger ?? '—'}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">{r.trigger_kind === 'category' ? 'category' : 'product'}</span>
                                    </td>
                                    <td className="p-3">
                                        <span className="flex items-center gap-2">
                                            <ArrowRight className="text-muted-foreground size-3.5" />
                                            {r.suggested ?? '—'}
                                        </span>
                                    </td>
                                    <td className="text-muted-foreground max-w-56 truncate p-3">{r.message ?? '—'}</td>
                                    <td className="text-muted-foreground p-3">{channelLabels[r.channel]}</td>
                                    <td className="p-3 text-right tabular-nums">{r.priority}</td>
                                    <td className="p-3">
                                        <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'On' : 'Off'}</Badge>
                                    </td>
                                    <td className="p-3">
                                        <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, rule: r })}>
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {rules.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground p-8 text-center">
                                        No rules yet. Example: when the cart has a coffee, offer a croissant.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RuleDialog open={dialog.open} rule={dialog.rule} products={products} categories={categories} onOpenChange={(open) => setDialog((current) => ({ ...current, open }))} />
        </>
    );
}

UpsellIndex.layout = {
    breadcrumbs: [
        { title: 'Kiosk', href: '/kiosk/devices' },
        { title: 'Upsell rules', href: index() },
    ],
};
