import OrderSummary from '@/kiosk/components/order-summary';
import { cn } from '@/lib/utils';

/**
 * The order, in a drawer. It slides in from the right on a landscape tablet and up from the bottom on a
 * portrait screen, and only when the customer taps "Review order".
 */
export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <div className={cn('fixed inset-0 z-40', !open && 'pointer-events-none')} aria-hidden={!open}>
            <div onClick={onClose} className={cn('absolute inset-0 bg-black/50 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} />

            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Your order"
                className={cn(
                    'bg-card absolute flex flex-col overflow-hidden shadow-2xl transition-transform duration-300 ease-out',
                    'landscape:inset-y-0 landscape:right-0 landscape:w-[clamp(26rem,40vw,38rem)] landscape:rounded-l-3xl',
                    'portrait:inset-x-0 portrait:bottom-0 portrait:h-[82%] portrait:rounded-t-3xl',
                    open ? 'translate-x-0 translate-y-0' : 'landscape:translate-x-full portrait:translate-y-full',
                )}
            >
                <span className="bg-border mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-full landscape:hidden" />
                <OrderSummary onClose={onClose} />
            </aside>
        </div>
    );
}
