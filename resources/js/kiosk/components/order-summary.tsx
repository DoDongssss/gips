import { Banknote, Check, ShoppingBag, X } from 'lucide-react';

import { peso, typeLabel } from '@/kiosk/format';
import { cartCount, lineCents, unitCents } from '@/kiosk/pricing';
import { useOrderPreview } from '@/kiosk/use-order-preview';
import { BigButton, CompactStepper, Thumb, warningText } from '@/kiosk/screens/ui';
import { useKiosk } from '@/kiosk/store';
import { useDragScroll } from '@/kiosk/use-drag-scroll';
import { cn } from '@/lib/utils';

/**
 * The order: lines, senior / PWD switch, total and the place-order button, shown inside the drawer.
 * Pass `onClose` to add the close button and an "Add more" action.
 */
export default function OrderSummary({ onClose }: { onClose?: () => void }) {
    const lines = useKiosk((s) => s.lines);
    const orderType = useKiosk((s) => s.orderType);
    const seniorPwd = useKiosk((s) => s.seniorPwd);
    const customerName = useKiosk((s) => s.customerName);
    const placing = useKiosk((s) => s.placing);
    const { setQuantity, setSeniorPwd, setCustomerName, checkout } = useKiosk.getState();

    const dragScroll = useDragScroll<HTMLDivElement>();
    const count = cartCount(lines);
    const { summary, calculating, fallbackCents } = useOrderPreview();
    const displayTotal = summary?.total_cents ?? fallbackCents;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
                    <ShoppingBag className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl leading-tight font-semibold tracking-tight">Your order</h2>
                    <p className="text-muted-foreground text-sm tabular-nums">
                        {orderType && `${typeLabel(orderType)} · `}
                        {count} {count === 1 ? 'item' : 'items'}
                    </p>
                </div>
                {onClose && (
                    <button type="button" onClick={onClose} aria-label="Close" className="bg-secondary flex size-11 items-center justify-center rounded-lg transition-transform active:scale-90">
                        <X className="size-5" />
                    </button>
                )}
            </div>

            <div ref={dragScroll} className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain p-3">
                {lines.length === 0 && (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                        <span className="bg-secondary text-foreground flex size-20 items-center justify-center rounded-xl">
                            <ShoppingBag className="size-9" strokeWidth={1.5} />
                        </span>
                        <p className="text-foreground text-xl font-semibold">Your order is empty</p>
                        <p className="text-base">Tap an item to add it.</p>
                        {onClose && (
                            <BigButton variant="tonal" onClick={onClose}>
                                Choose items
                            </BigButton>
                        )}
                    </div>
                )}

                {lines.map((line) => (
                    <div key={line.key} className="bg-secondary flex items-center gap-2.5 rounded-xl p-2">
                        <Thumb src={line.product.image_url} name={line.product.name} className="size-14 shrink-0 rounded-lg text-xl" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-base leading-tight font-semibold">{line.product.name}</p>
                            {(line.variant || line.modifiers.length > 0) && (
                                <p className="text-muted-foreground truncate text-sm">{[line.variant?.name, ...line.modifiers.map((m) => m.name)].filter(Boolean).join(', ')}</p>
                            )}
                            <p className="text-base font-semibold tabular-nums">
                                {peso(lineCents(line))}
                                {line.quantity > 1 && (
                                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                        {peso(unitCents(line.product, line.variant, line.modifiers, line.upsellUnitPriceCents))} each
                                    </span>
                                )}
                            </p>
                        </div>
                        <CompactStepper value={line.quantity} onChange={(n) => setQuantity(line.key, n)} />
                    </div>
                ))}

                {lines.length > 0 && (
                    <label className="bg-card block rounded-xl border px-3 py-2.5">
                        <span className="text-muted-foreground block text-sm">Name for your order (optional)</span>
                        <input
                            type="text"
                            maxLength={100}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Your name"
                            className="mt-1 w-full bg-transparent text-base font-medium outline-none"
                        />
                    </label>
                )}

                {lines.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setSeniorPwd(!seniorPwd)}
                        aria-pressed={seniorPwd}
                        className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors', seniorPwd ? 'border-warning bg-warning/15' : 'border-border bg-card')}
                    >
                        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md border-2', seniorPwd ? 'border-warning bg-warning text-warning-foreground' : 'border-muted-foreground/40')}>
                            {seniorPwd && <Check className="size-4" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                            <span className={cn('block text-base leading-tight font-semibold', seniorPwd && warningText)}>Senior citizen or PWD</span>
                            <span className="text-muted-foreground block text-sm leading-tight">Show your ID to the cashier. The discount is applied at the counter.</span>
                        </span>
                    </button>
                )}
            </div>

            <div className="space-y-3 border-t border-dashed px-4 py-3">
                <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-lg">Total</span>
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">{calculating && !summary ? '…' : peso(displayTotal)}</span>
                </div>
                {summary && summary.tax_cents > 0 && (
                    <p className="text-muted-foreground text-sm tabular-nums">
                        Subtotal {peso(summary.subtotal_cents)} · Tax {peso(summary.tax_cents)}
                    </p>
                )}
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Banknote className="size-4 shrink-0" />
                    Pay at the counter. Final amount confirmed there.
                </p>

                <div className="flex gap-2">
                    {onClose && (
                        <BigButton variant="tonal" onClick={onClose} className="flex-1 px-4">
                            Add more
                        </BigButton>
                    )}
                    <BigButton variant="success" disabled={lines.length === 0 || placing} onClick={() => void checkout()} className={cn('text-xl', onClose ? 'flex-[2]' : 'w-full')}>
                        {placing ? 'Placing your order…' : 'Place order'}
                    </BigButton>
                </div>
            </div>
        </div>
    );
}
