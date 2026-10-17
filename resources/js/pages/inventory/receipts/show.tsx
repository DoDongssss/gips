import { Head } from '@inertiajs/react';

import { formatQty } from '@/lib/inventory';
import { formatPeso } from '@/lib/money';
import { index } from '@/routes/inventory/receipts';

type Props = {
    receipt: {
        id: number;
        receipt_number: string;
        supplier: string | null;
        po_number: string | null;
        invoice_no: string | null;
        notes: string | null;
        received_by: string | null;
        received_at: string | null;
        items: { ingredient: string; unit: string; quantity: string; unit_cost_cents: number; batch_no: string | null; expires_on: string | null }[];
    };
};

export default function ReceiptShow({ receipt }: Props) {
    const total = receipt.items.reduce((sum, item) => sum + Math.round(Number(item.quantity) * item.unit_cost_cents), 0);

    return (
        <>
            <Head title={receipt.receipt_number} />

            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">{receipt.receipt_number}</h1>
                    <p className="text-muted-foreground text-sm" suppressHydrationWarning>
                        {receipt.supplier} · {receipt.po_number ?? 'no purchase order'}
                        {receipt.invoice_no && ` · invoice ${receipt.invoice_no}`}
                        {receipt.received_at && ` · ${new Date(receipt.received_at).toLocaleString()}`}
                        {receipt.received_by && ` · ${receipt.received_by}`}
                    </p>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Ingredient</th>
                                <th className="p-3 text-right font-medium">Received</th>
                                <th className="p-3 text-right font-medium">Unit cost</th>
                                <th className="p-3 text-right font-medium">Line total</th>
                                <th className="p-3 font-medium">Batch</th>
                                <th className="p-3 font-medium">Expires</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items.map((item, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <td className="p-3 font-medium">{item.ingredient}</td>
                                    <td className="p-3 text-right tabular-nums">
                                        {formatQty(item.quantity)} {item.unit}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{formatPeso(item.unit_cost_cents)}</td>
                                    <td className="p-3 text-right tabular-nums">{formatPeso(Math.round(Number(item.quantity) * item.unit_cost_cents))}</td>
                                    <td className="text-muted-foreground p-3">{item.batch_no ?? '—'}</td>
                                    <td className="text-muted-foreground p-3">{item.expires_on ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-semibold">
                                <td colSpan={3} className="p-3 text-right">
                                    Total
                                </td>
                                <td className="p-3 text-right tabular-nums">{formatPeso(total)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {receipt.notes && <p className="rounded-lg border p-4 text-sm">{receipt.notes}</p>}
            </div>
        </>
    );
}

ReceiptShow.layout = {
    breadcrumbs: [
        { title: 'Inventory', href: '/inventory/ingredients' },
        { title: 'Receiving', href: index() },
        { title: 'Receipt', href: index() },
    ],
};
