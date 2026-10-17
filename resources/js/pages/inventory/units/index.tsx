import { Head, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/lib/inventory';
import ConversionDialog from '@/pages/inventory/units/conversion-dialog';
import UnitDialog from '@/pages/inventory/units/unit-dialog';
import { destroy as destroyConversion } from '@/routes/inventory/conversions';
import { destroy, index } from '@/routes/inventory/units';
import type { Conversion, Unit } from '@/types/inventory';

type Props = { units: Unit[]; conversions: Conversion[]; types: string[] };

export default function UnitsIndex({ units, conversions }: Props) {
    const [unitDialog, setUnitDialog] = useState<{ open: boolean; unit?: Unit }>({ open: false });
    const [conversionOpen, setConversionOpen] = useState(false);

    function removeUnit(unit: Unit) {
        if (confirm(`Delete "${unit.name}"? Its conversions are removed too.`)) {
            router.delete(destroy.url(unit.id), {
                preserveScroll: true,
                onError: (errors) => toast.error(Object.values(errors)[0] ?? 'That unit could not be deleted.'),
            });
        }
    }

    function removeConversion(conversion: Conversion) {
        if (confirm(`Remove 1 ${conversion.from.abbreviation} = ${formatQty(conversion.factor)} ${conversion.to.abbreviation}?`)) {
            router.delete(destroyConversion.url(conversion.id), { preserveScroll: true });
        }
    }

    return (
        <>
            <Head title="Units" />

            <div className="space-y-8 p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Units &amp; conversions</h1>
                    <p className="text-muted-foreground text-sm">What stock is counted in, and how the units relate to each other.</p>
                </div>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Units</h2>
                        <Can permission="inventory.adjust">
                            <Button onClick={() => setUnitDialog({ open: true })}>Add unit</Button>
                        </Can>
                    </div>

                    <div className="rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground border-b text-left">
                                <tr>
                                    <th className="p-3 font-medium">Name</th>
                                    <th className="p-3 font-medium">Abbreviation</th>
                                    <th className="p-3 font-medium">Measures</th>
                                    <th className="w-40 p-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                    <tr key={unit.id} className="border-b last:border-0">
                                        <td className="p-3 font-medium">{unit.name}</td>
                                        <td className="p-3">{unit.abbreviation}</td>
                                        <td className="p-3">
                                            <Badge variant="secondary" className="capitalize">
                                                {unit.type}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <Can permission="inventory.adjust">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setUnitDialog({ open: true, unit })}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="icon" aria-label={`Delete ${unit.name}`} onClick={() => removeUnit(unit)}>
                                                        <Trash2 className="text-destructive size-4" />
                                                    </Button>
                                                </div>
                                            </Can>
                                        </td>
                                    </tr>
                                ))}
                                {units.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-muted-foreground p-6 text-center">
                                            No units yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold">Conversions</h2>
                            <p className="text-muted-foreground text-sm">Needed when a recipe or delivery uses a different unit than the ingredient&apos;s base unit.</p>
                        </div>
                        <Can permission="inventory.adjust">
                            <Button variant="outline" onClick={() => setConversionOpen(true)}>
                                Add conversion
                            </Button>
                        </Can>
                    </div>

                    <ul className="divide-y rounded-lg border">
                        {conversions.map((conversion) => (
                            <li key={conversion.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                                <span>
                                    1 <strong>{conversion.from.name}</strong> = {formatQty(conversion.factor)} <strong>{conversion.to.name}</strong>
                                </span>
                                <Can permission="inventory.adjust">
                                    <Button variant="ghost" size="icon" aria-label="Remove conversion" onClick={() => removeConversion(conversion)}>
                                        <Trash2 className="text-destructive size-4" />
                                    </Button>
                                </Can>
                            </li>
                        ))}
                        {conversions.length === 0 && <li className="text-muted-foreground p-6 text-center text-sm">No conversions yet.</li>}
                    </ul>
                </section>
            </div>

            <UnitDialog open={unitDialog.open} unit={unitDialog.unit} onOpenChange={(open) => setUnitDialog((current) => ({ ...current, open }))} />
            <ConversionDialog open={conversionOpen} onOpenChange={setConversionOpen} units={units} />
        </>
    );
}

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: index() },
        { title: 'Units', href: index() },
    ],
};
