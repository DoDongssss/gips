import { Head, router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Can } from '@/components/shared/can';
import { DataTable } from '@/components/shared/data-table';
import { Pager } from '@/components/shared/pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanQuery, formatQty } from '@/lib/inventory';
import { conversionColumnClassNames, getConversionColumns } from '@/pages/inventory/units/conversion-columns';
import { columnClassNames, getColumns } from '@/pages/inventory/units/columns';
import ConversionDialog from '@/pages/inventory/units/conversion-dialog';
import UnitDialog from '@/pages/inventory/units/unit-dialog';
import { destroy as destroyConversion } from '@/routes/inventory/conversions';
import { destroy, index } from '@/routes/inventory/units';
import type { Conversion, Unit, UnitType } from '@/types/inventory';
import type { Paginated } from '@/types/menu';

type Filters = {
    search: string;
    type: UnitType | null;
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
    conv_search: string;
    conv_sort?: string | null;
    conv_direction?: 'asc' | 'desc' | null;
};

type Props = {
    units?: Paginated<Unit>;
    conversions?: Conversion[];
    unitPicker?: Unit[];
    types: UnitType[];
    filters: Filters;
};

const ALL = 'all';

const ONLY = ['units', 'conversions', 'unitPicker', 'filters'];

const typeLabels: Record<UnitType, string> = { weight: 'Weight', volume: 'Volume', count: 'Count' };

export default function UnitsIndex({ units, conversions, unitPicker, types, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [convSearch, setConvSearch] = useState(filters.conv_search ?? '');
    const [loading, setLoading] = useState(false);
    const [unitDialog, setUnitDialog] = useState<{ open: boolean; unit?: Unit }>({ open: false });
    const [conversionOpen, setConversionOpen] = useState(false);

    const [loadedUnits, setLoadedUnits] = useState<Paginated<Unit> | undefined>(units);
    const [loadedConversions, setLoadedConversions] = useState<Conversion[] | undefined>(conversions);
    const [loadedPicker, setLoadedPicker] = useState<Unit[] | undefined>(unitPicker);

    const dataUnits = units ?? loadedUnits;
    const dataConversions = conversions ?? loadedConversions;
    const picker = unitPicker ?? loadedPicker ?? [];

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

    const unitColumns = useMemo(
        () =>
            getColumns({
                onEdit: (unit) => setUnitDialog({ open: true, unit }),
                onDelete: removeUnit,
            }),
        // removeUnit is stable for the lifetime of the page
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const conversionColumns = useMemo(() => getConversionColumns({ onDelete: removeConversion }), []);

    const unitSorting = useMemo<SortingState>(
        () => (filters.sort ? [{ id: filters.sort, desc: filters.direction === 'desc' }] : []),
        [filters.sort, filters.direction],
    );

    const convSorting = useMemo<SortingState>(
        () => (filters.conv_sort ? [{ id: filters.conv_sort, desc: filters.conv_direction === 'desc' }] : []),
        [filters.conv_sort, filters.conv_direction],
    );

    function visit(next: Partial<Filters> = {}) {
        const merged = { ...filters, ...next };

        router.get(
            index.url(),
            cleanQuery({
                search: merged.search,
                type: merged.type,
                sort: merged.sort,
                direction: merged.direction,
                conv_search: merged.conv_search,
                conv_sort: merged.conv_sort,
                conv_direction: merged.conv_direction,
            }),
            {
                only: ONLY,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    function loadCatalog() {
        router.reload({
            only: ONLY,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    useEffect(() => {
        if (units) {
            setLoadedUnits(units);
            if (conversions) {
                setLoadedConversions(conversions);
            }
            if (unitPicker) {
                setLoadedPicker(unitPicker);
            }
        } else if (loadedUnits) {
            loadCatalog();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [units, conversions, unitPicker]);

    function submitUnitSearch(event: FormEvent) {
        event.preventDefault();
        visit({ search });
    }

    function submitConvSearch(event: FormEvent) {
        event.preventDefault();
        visit({ conv_search: convSearch });
    }

    function handleUnitSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            sort: first?.id ?? null,
            direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    function handleConvSortingChange(next: SortingState) {
        const [first] = next;

        visit({
            conv_sort: first?.id ?? null,
            conv_direction: first ? (first.desc ? 'desc' : 'asc') : null,
        });
    }

    return (
        <>
            <Head title="Units" />

            <div className="space-y-8 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">Units &amp; conversions</h1>
                    <p className="text-muted-foreground text-sm">What stock is counted in, and how the units relate to each other.</p>
                </div>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="font-semibold">Units</h2>
                            {dataUnits && <p className="text-muted-foreground text-sm">{dataUnits.total} total</p>}
                        </div>
                        <Can permission="inventory.adjust">
                            <Button onClick={() => setUnitDialog({ open: true })}>Add unit</Button>
                        </Can>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <form onSubmit={submitUnitSearch} className="flex min-w-64 max-w-sm flex-1 gap-2">
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or abbreviation" aria-label="Search units" />
                            <Button type="submit" variant="outline" disabled={loading}>
                                Search
                            </Button>
                        </form>

                        <Select value={filters.type ?? ALL} onValueChange={(value) => visit({ type: value === ALL ? null : (value as UnitType) })}>
                            <SelectTrigger className="w-40" aria-label="Measure type">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All types</SelectItem>
                                {types.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {typeLabels[type]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DataTable
                        columns={unitColumns}
                        data={dataUnits?.data ?? []}
                        sorting={unitSorting}
                        onSortingChange={handleUnitSortingChange}
                        columnClassNames={columnClassNames}
                        emptyContent={
                            dataUnits ? (
                                'No units found.'
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-sm">Units aren&apos;t loaded yet.</p>
                                    <Button onClick={loadCatalog} disabled={loading}>
                                        {loading ? 'Loading…' : 'Load units'}
                                    </Button>
                                </div>
                            )
                        }
                    />

                    {dataUnits && (
                        <Pager
                            currentPage={dataUnits.current_page}
                            lastPage={dataUnits.last_page}
                            prevUrl={dataUnits.prev_page_url}
                            nextUrl={dataUnits.next_page_url}
                            only={ONLY}
                        />
                    )}
                </section>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="font-semibold">Conversions</h2>
                            <p className="text-muted-foreground text-sm">Needed when a recipe or delivery uses a different unit than the ingredient&apos;s base unit.</p>
                            {dataConversions && <p className="text-muted-foreground text-sm">{dataConversions.length} total</p>}
                        </div>
                        <Can permission="inventory.adjust">
                            <Button variant="outline" disabled={picker.length === 0} onClick={() => setConversionOpen(true)}>
                                Add conversion
                            </Button>
                        </Can>
                    </div>

                    <form onSubmit={submitConvSearch} className="flex max-w-sm gap-2">
                        <Input value={convSearch} onChange={(e) => setConvSearch(e.target.value)} placeholder="Search conversion units" aria-label="Search conversions" />
                        <Button type="submit" variant="outline" disabled={loading}>
                            Search
                        </Button>
                    </form>

                    <DataTable
                        columns={conversionColumns}
                        data={dataConversions ?? []}
                        sorting={convSorting}
                        onSortingChange={handleConvSortingChange}
                        columnClassNames={conversionColumnClassNames}
                        emptyContent={
                            dataConversions ? (
                                'No conversions yet.'
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-sm">Conversions aren&apos;t loaded yet.</p>
                                    <Button onClick={loadCatalog} disabled={loading}>
                                        {loading ? 'Loading…' : 'Load conversions'}
                                    </Button>
                                </div>
                            )
                        }
                    />
                </section>
            </div>

            <UnitDialog open={unitDialog.open} unit={unitDialog.unit} onOpenChange={(open) => setUnitDialog((current) => ({ ...current, open }))} />
            <ConversionDialog open={conversionOpen} onOpenChange={setConversionOpen} units={picker} />
        </>
    );
}

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: index() },
        { title: 'Units', href: index() },
    ],
};
