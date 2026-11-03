import { Badge } from '@/components/ui/badge';
import { poStatusLabels } from '@/lib/inventory';
import type { PoStatus } from '@/types/inventory';

const tone: Record<PoStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    sent: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    partial: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    received: 'bg-green-100 text-green-800 hover:bg-green-100',
    cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
};

export function PoStatusBadge({ status }: { status: PoStatus }) {
    return <Badge className={tone[status]}>{poStatusLabels[status]}</Badge>;
}

/** Stock level flags: negative stock and at-or-under reorder level. */
export function StockFlag({ negative, low }: { negative: boolean; low: boolean }) {
    if (negative) {
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>;
    }

    return low ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low</Badge> : null;
}
