import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePricedCart } from '@/hooks/use-priced-cart';
import { errorList } from '@/lib/pos-http';
import { formatPeso } from '@/lib/money';
import type { CartLine } from '@/stores/cart-store';
import { useCartStore } from '@/stores/cart-store';
import { cancelEditing } from '@/lib/order-edit';
import { useOrderEdit } from '@/stores/order-edit-store';

type Props = {
    onEditLine: (line: CartLine) => void;
    onCheckout: () => void;
};

function TotalRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-base text-gray-600">
            <span>{label}</span>
            <span className="font-medium text-gray-900 tabular-nums">{value}</span>
        </div>
    );
}

export function CartPanel({ onEditLine, onCheckout }: Props) {
    const cart = useCartStore();
    const editing = useOrderEdit((state) => state.editing);
    const { hasLines, summary, priced, calculating, error, isLocal, localLines, localSubtotal } = usePricedCart();

    const itemCount = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
    const tax = summary?.taxes[0];
    const canCheckout = hasLines && !calculating && !error && (isLocal || !!priced);

    return (
        <aside className="flex min-h-0 flex-col bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="size-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Order</h2>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 tabular-nums">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    <Button variant="ghost" className="h-10 px-3 text-base text-red-600 hover:bg-red-50 hover:text-red-700" disabled={!hasLines} onClick={() => (editing ? cancelEditing() : cart.clear())}>
                        <Trash2 className="size-4" />
                        Clear
                    </Button>
                </div>

                <div className="mt-2 inline-flex gap-0.5 rounded-lg bg-white/70 p-0.5 shadow-xs">
                    {(['takeout', 'dine_in'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={cart.type === type}
                            className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
                                cart.type === type ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                            }`}
                            onClick={() => cart.setType(type)}
                        >
                            {type === 'takeout' ? 'Takeout' : 'Dine in'}
                        </button>
                    ))}
                </div>
            </div>

            {editing && (
                <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-base text-amber-900">
                    <span>
                        Editing order <strong>{editing.order_number}</strong>
                    </span>
                    <Button variant="outline" className="h-9 px-3 text-sm" onClick={cancelEditing}>
                        Cancel edit
                    </Button>
                </div>
            )}

            {/* Lines */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {!hasLines ? (
                    <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-gray-100">
                            <ShoppingCart className="size-8 text-gray-400" />
                        </div>
                        <h3 className="mb-1 text-lg font-medium text-gray-900">No items yet</h3>
                        <p className="text-base text-gray-500">Tap an item to start an order.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cart.lines.map((line, index) => {
                            const row = priced?.lines[index];
                            const local = localLines[index];
                            const unitPrice = row ? row.unit_price_cents + row.modifiers_total_cents : (local?.unit_cents ?? null);
                            const lineTotal = row ? row.gross_cents : (local?.gross_cents ?? null);

                            return (
                                <div key={line.uid} className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEditLine(line)} title="Edit">
                                        <h4 className="text-base leading-snug font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                            {line.name}
                                            {line.variant_name && <span className="font-normal text-gray-500"> · {line.variant_name}</span>}
                                        </h4>
                                        {line.modifier_names.length > 0 && (
                                            <p className="text-sm leading-snug text-gray-500 [overflow-wrap:anywhere]">{line.modifier_names.join(', ')}</p>
                                        )}
                                        {line.notes && <p className="text-sm leading-snug text-gray-500 italic [overflow-wrap:anywhere]">“{line.notes}”</p>}
                                        <p className="mt-1 text-sm text-gray-600 tabular-nums">{unitPrice ? `${formatPeso(unitPrice)} each` : '…'}</p>
                                        <p className="text-base font-semibold text-blue-600 tabular-nums">{lineTotal !== null ? formatPeso(lineTotal) : '…'}</p>
                                    </button>

                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <div className="flex items-center">
                                            <Button variant="outline" size="icon" className="size-9" aria-label="Fewer" onClick={() => cart.setQuantity(line.uid, line.quantity - 1)}>
                                                <Minus className="size-4" />
                                            </Button>
                                            <span className="min-w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">
                                                {line.quantity}
                                            </span>
                                            <Button variant="outline" size="icon" className="size-9" aria-label="More" onClick={() => cart.setQuantity(line.uid, line.quantity + 1)}>
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            aria-label={`Remove ${line.name}`}
                                            onClick={() => cart.removeLine(line.uid)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
                {summary && (
                    <div className="space-y-1.5">
                        <TotalRow label="Subtotal" value={formatPeso(summary.subtotal_cents)} />
                        {summary.discount_cents > 0 && <TotalRow label="Discounts" value={`−${formatPeso(summary.discount_cents)}`} />}
                        {tax && <TotalRow label={`${tax.name} ${Math.round(Number(tax.rate) * 10000) / 100}%${tax.is_inclusive ? ' (included)' : ''}`} value={formatPeso(tax.tax_cents)} />}
                        <div className="mt-2 flex items-baseline justify-between border-t border-gray-200 pt-2">
                            <span className="text-xl font-bold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-blue-600 tabular-nums" aria-live="polite">
                                {formatPeso(summary.total_cents)}
                            </span>
                        </div>
                    </div>
                )}

                {isLocal && (
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-blue-600 tabular-nums" aria-live="polite">
                            {formatPeso(localSubtotal)}
                        </span>
                    </div>
                )}

                {error && (
                    <div className="mt-2 space-y-1 text-sm text-red-600" role="alert">
                        {errorList(error).map((message) => (
                            <p key={message}>{message}</p>
                        ))}
                    </div>
                )}

                <Button className="mt-3 h-14 w-full bg-blue-600 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50" disabled={!canCheckout} onClick={onCheckout}>
                    {editing ? 'Update order' : 'Checkout'}{summary ? ` · ${formatPeso(summary.total_cents)}` : isLocal ? ` · ${formatPeso(localSubtotal)}` : ''}
                </Button>
            </div>
        </aside>
    );
}
