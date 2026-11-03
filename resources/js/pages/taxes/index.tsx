import { Head } from '@inertiajs/react';
import { useState } from 'react';

import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TaxFormDialog from '@/pages/taxes/form-dialog';
import type { TaxRecord } from '@/pages/taxes/form-dialog';
import { index } from '@/routes/taxes';

type Props = {
    taxes: TaxRecord[];
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    tax?: TaxRecord;
};

export default function Index({ taxes }: Props) {
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });

    return (
        <>
            <Head title="Tax" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Tax</h1>
                        <p className="text-muted-foreground text-sm">The default active tax is used to price every order.</p>
                    </div>

                    <Can permission="setting.update">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', tax: undefined })}>Add tax</Button>
                    </Can>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Prices</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {taxes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                        No taxes yet. Orders are priced without tax until a default tax is set.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                taxes.map((tax) => (
                                    <TableRow key={tax.id}>
                                        <TableCell className="font-medium">
                                            {tax.name}
                                            {tax.is_default && (
                                                <Badge variant="outline" className="ml-2">
                                                    Default
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{tax.rate_percent}%</TableCell>
                                        <TableCell className="text-muted-foreground">{tax.is_inclusive ? 'Tax included' : 'Tax added on top'}</TableCell>
                                        <TableCell>
                                            <Badge variant={tax.is_active ? 'default' : 'secondary'}>{tax.is_active ? 'Active' : 'Off'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Can permission="setting.update">
                                                <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, mode: 'edit', tax })}>
                                                    Edit
                                                </Button>
                                            </Can>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <TaxFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                tax={dialog.tax}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Tax', href: index() }],
};
