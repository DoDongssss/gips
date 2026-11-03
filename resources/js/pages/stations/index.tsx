import { Head } from '@inertiajs/react';
import { useState } from 'react';

import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StationFormDialog from '@/pages/stations/form-dialog';
import type { StationCategory, StationRecord } from '@/pages/stations/form-dialog';
import { index } from '@/routes/stations';

type Props = {
    stations: StationRecord[];
    categories: StationCategory[];
};

type DialogState = {
    open: boolean;
    mode: 'create' | 'edit';
    station?: StationRecord;
};

const TYPE_LABEL: Record<string, string> = { bar: 'Bar', kitchen: 'Kitchen', pastry: 'Pastry', other: 'Other' };

export default function Index({ stations, categories }: Props) {
    const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
    const categoryName = (id: number) => categories.find((category) => category.id === id)?.name;

    return (
        <>
            <Head title="Stations" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Stations</h1>
                        <p className="text-muted-foreground text-sm">
                            Where each order line is prepared. Every station gets its own kitchen screen.
                        </p>
                    </div>

                    <Can permission="setting.update">
                        <Button onClick={() => setDialog({ open: true, mode: 'create', station: undefined })}>
                            Add station
                        </Button>
                    </Can>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Categories</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                        No stations yet. Orders get no kitchen tickets until one is added.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stations.map((station) => (
                                    <TableRow key={station.id}>
                                        <TableCell className="font-medium">{station.name}</TableCell>
                                        <TableCell>{TYPE_LABEL[station.type] ?? station.type}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {station.category_ids.map(categoryName).filter(Boolean).join(', ') ||
                                                'None'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={station.is_active ? 'default' : 'secondary'}>
                                                {station.is_active ? 'Active' : 'Off'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Can permission="setting.update">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDialog({ open: true, mode: 'edit', station })}
                                                >
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

            <StationFormDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
                mode={dialog.mode}
                station={dialog.station}
                stations={stations}
                categories={categories}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Stations', href: index() }],
};
