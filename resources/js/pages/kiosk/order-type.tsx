import { ChevronRight, ShoppingBag, UtensilsCrossed } from 'lucide-react';

import { useKiosk } from '@/stores/kiosk-store';
import { BigButton, Frame, TopBar, tintStyle } from '@/components/kiosk/ui';
import type { OrderType } from '@/types/kiosk';

const options: { type: OrderType; label: string; hint: string; icon: typeof ShoppingBag; tint: string }[] = [
    { type: 'dine_in', label: 'Dine in', hint: 'Eat here', icon: UtensilsCrossed, tint: 'var(--chart-1)' },
    { type: 'takeout', label: 'Takeout', hint: 'Take it with you', icon: ShoppingBag, tint: 'var(--chart-3)' },
];

export default function OrderTypeScreen() {
    const chooseType = useKiosk((s) => s.chooseType);
    const reset = useKiosk((s) => s.reset);

    return (
        <Frame className="bg-secondary">
            <TopBar title="How would you like your order?" onBack={() => reset('abandoned')} />

            <div className="grid flex-1 grid-cols-2 gap-4 p-5 portrait:grid-cols-1">
                {options.map(({ type, label, hint, icon: Icon, tint }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => chooseType(type)}
                        className="bg-card ring-border relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl shadow-sm ring-1 transition-all duration-150 active:scale-[0.98]"
                    >
                        <span aria-hidden className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: tint }} />

                        <span className="flex size-44 items-center justify-center rounded-2xl" style={tintStyle(tint)}>
                            <Icon className="size-20" strokeWidth={1.5} />
                        </span>

                        <span className="space-y-1 text-center">
                            <span className="block text-5xl font-semibold tracking-tight">{label}</span>
                            <span className="text-muted-foreground block text-2xl">{hint}</span>
                        </span>

                        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-6 py-3 text-xl font-semibold shadow-sm">
                            Choose
                            <ChevronRight className="size-5" />
                        </span>
                    </button>
                ))}
            </div>

            <div className="px-5 pb-5">
                <BigButton variant="ghost" onClick={() => reset('abandoned')} className="w-full">
                    Cancel
                </BigButton>
            </div>
        </Frame>
    );
}
