import { Banknote, Check, ShoppingBag, X } from 'lucide-react';

import { peso } from '@/kiosk/format';
import { cartCents, cartCount, lineCents, unitCents } from '@/kiosk/pricing';
import { BigButton, CompactStepper, Thumb, warningText } from '@/kiosk/screens/ui';
import { useKiosk } from '@/kiosk/store';
import { cn } from '@/lib/utils';

/**
 * The order: lines, senior / PWD switch, total and the place-order button.
 * Shown beside the menu on a landscape tablet and inside the bottom sheet on a portrait one.
 * Pass `onClose` when it sits in the sheet: it adds the close button and an "Add more" action.
 */
export default function OrderSummary({ onClose }: { onClose?: () => void }) {
    const lines = useKiosk((s) => s.lines);
    const seniorPwd = useKiosk((s) => s.seniorPwd);
    const placing = useKiosk((s) => s.placing);
    const { setQuantity, setSeniorPwd, checkout } = useKiosk.getState();

    const count = cartCount(lines);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-4 px-6 pt-6 pb-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-3xl font-semibold tracking-tight">Your order</h2>
                    <p className="text-muted-foreground tabular-nums">
                        {count} {count === 1 ? 'item' : 'items'}
                    </p>
                </div>
                {onClose && (
                    <button type="button" onClick={onClose} aria-label="Close" className="bg-secondary flex size-12 items-center justify-center rounded-full transition-transform active:scale-90">
                        <X className="size-6" />
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 portrait:px-6">
                {lines.length === 0 && (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                        <span className="bg-secondary text-foreground flex size-24 items-center justify-center rounded-full">
                            <ShoppingBag className="size-10" strokeWidth={1.5} />
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
                    <div key={line.key} className="bg-secondary flex items-center gap-3 rounded-2xl p-3">
                        <Thumb src={line.product.image_url} name={line.product.name} className="size-16 shrink-0 rounded-xl text-2xl" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-lg leading-tight font-semibold">{line.product.name}</p>
                            {(line.variant || line.modifiers.length > 0) && (
                                <p className="text-muted-foreground truncate text-sm">{[line.variant?.name, ...line.modifiers.map((m) => m.name)].filter(Boolean).join(', ')}</p>
                            )}
                            <p className="text-lg font-semibold tabular-nums">{peso(lineCents(line))}</p>
                            {line.quantity > 1 && <p className="text-muted-foreground text-xs tabular-nums">{peso(unitCents(line.product, line.variant, line.modifiers))} each</p>}
                        </div>
                        <CompactStepper value={line.quantity} onChange={(n) => setQuantity(line.key, n)} />
                    </div>
                ))}

                {lines.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setSeniorPwd(!seniorPwd)}
                        aria-pressed={seniorPwd}
                        className={cn('flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors', seniorPwd ? 'border-warning bg-warning/15' : 'border-border bg-card')}
                    >
                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border-2', seniorPwd ? 'border-warning bg-warning text-warning-foreground' : 'border-muted-foreground/40')}>
                            {seniorPwd && <Check className="size-5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                            <span className={cn('block text-base leading-tight font-semibold', seniorPwd && warningText)}>Senior citizen or PWD</span>
                            <span className="text-muted-foreground block text-sm leading-tight">Show your ID to the cashier. The discount is applied at the counter.</span>
                        </span>
                    </button>
                )}
            </div>

            <div className="space-y-4 border-t px-6 py-5 portrait:px-8">
                <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-xl">Total</span>
                    <span className="text-5xl font-semibold tracking-tight tabular-nums">{peso(cartCents(lines))}</span>
                </div>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Banknote className="size-4 shrink-0" />
                    Pay at the counter. Final amount confirmed there.
                </p>

                <div className="flex gap-3">
                    {onClose && (
                        <BigButton variant="tonal" onClick={onClose} className="flex-1 px-4">
                            Add more
                        </BigButton>
                    )}
                    <BigButton variant="success" disabled={lines.length === 0 || placing} onClick={() => void checkout()} className={cn('text-2xl', onClose ? 'flex-[2]' : 'w-full')}>
                        {placing ? 'Placing your order…' : 'Place order'}
                    </BigButton>
                </div>
            </div>
        </div>
    );
}
