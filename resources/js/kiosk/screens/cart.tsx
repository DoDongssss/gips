import { Trash2 } from 'lucide-react';

import { peso, typeLabel } from '@/kiosk/format';
import { cartCents, lineCents, unitCents } from '@/kiosk/pricing';
import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame, Stepper, Thumb, TopBar } from '@/kiosk/screens/ui';
import { cn } from '@/lib/utils';

export default function CartScreen() {
    const lines = useKiosk((s) => s.lines);
    const orderType = useKiosk((s) => s.orderType);
    const seniorPwd = useKiosk((s) => s.seniorPwd);
    const placing = useKiosk((s) => s.placing);
    const { setQuantity, setSeniorPwd, goto, checkout } = useKiosk.getState();

    return (
        <Frame>
            <TopBar title="Your order" onBack={() => goto('menu')} right={orderType && <span className="bg-muted rounded-full px-4 py-2 text-lg font-medium">{typeLabel(orderType)}</span>} />

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {lines.length === 0 && <p className="text-muted-foreground py-16 text-center text-xl">Your order is empty.</p>}

                {lines.map((line) => (
                    <div key={line.key} className="bg-card flex items-center gap-4 rounded-2xl border p-3">
                        <Thumb src={line.product.image_url} name={line.product.name} className="size-20 shrink-0 rounded-xl text-3xl" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xl font-semibold">
                                {line.product.name}
                                {line.variant ? <span className="text-muted-foreground font-normal"> · {line.variant.name}</span> : null}
                            </p>
                            {line.modifiers.length > 0 && <p className="text-muted-foreground truncate">{line.modifiers.map((m) => m.name).join(', ')}</p>}
                            <p className="text-muted-foreground text-sm tabular-nums">{peso(unitCents(line.product, line.variant, line.modifiers))} each</p>
                        </div>
                        <Stepper value={line.quantity} min={1} onChange={(n) => setQuantity(line.key, n)} />
                        <p className="w-28 text-right text-xl font-bold tabular-nums">{peso(lineCents(line))}</p>
                        <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => setQuantity(line.key, 0)} className="text-destructive flex size-12 items-center justify-center rounded-full active:bg-red-50">
                            <Trash2 className="size-6" />
                        </button>
                    </div>
                ))}

                {lines.length > 0 && (
                    <button type="button" onClick={() => setSeniorPwd(!seniorPwd)} aria-pressed={seniorPwd} className={cn('flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left', seniorPwd ? 'border-primary bg-primary/10' : 'border-border')}>
                        <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border-2 text-lg font-bold', seniorPwd ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{seniorPwd ? '✓' : ''}</span>
                        <span>
                            <span className="block text-xl font-semibold">I am a senior citizen or person with a disability</span>
                            <span className="text-muted-foreground block">Show your ID to the cashier when you pay. Your discount is applied at the counter.</span>
                        </span>
                    </button>
                )}
            </div>

            <div className="space-y-3 border-t p-5">
                <div className="flex items-baseline justify-between">
                    <span className="text-xl">Total</span>
                    <span className="text-4xl font-extrabold tabular-nums">{peso(cartCents(lines))}</span>
                </div>
                <p className="text-muted-foreground text-sm">You pay at the counter. The final amount is confirmed there.</p>
                <div className="flex gap-3">
                    <BigButton variant="outline" onClick={() => goto('menu')} className="flex-1">
                        Add more
                    </BigButton>
                    <BigButton disabled={lines.length === 0 || placing} onClick={() => void checkout()} className="flex-[2]">
                        {placing ? 'Placing your order…' : 'Place order'}
                    </BigButton>
                </div>
            </div>
        </Frame>
    );
}
