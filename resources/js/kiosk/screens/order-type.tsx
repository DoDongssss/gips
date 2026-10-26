import { ChevronRight, ShoppingBag, UtensilsCrossed } from 'lucide-react';

import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame, TopBar, tintStyle } from '@/kiosk/screens/ui';
import type { OrderType } from '@/kiosk/types';

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

            <div className="grid flex-1 grid-cols-2 gap-6 p-8 portrait:grid-cols-1 portrait:gap-8">
                {options.map(({ type, label, hint, icon: Icon, tint }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => chooseType(type)}
                        className="bg-card relative flex flex-col items-center justify-center gap-8 overflow-hidden rounded-3xl shadow-md transition-all duration-150 active:scale-[0.98]"
                    >
                        <span aria-hidden className="absolute inset-x-0 top-0 h-3" style={{ backgroundColor: tint }} />

                        <span className="flex size-52 items-center justify-center rounded-full" style={tintStyle(tint)}>
                            <Icon className="size-24" strokeWidth={1.5} />
                        </span>

                        <span className="space-y-2 text-center">
                            <span className="block text-6xl font-semibold tracking-tight">{label}</span>
                            <span className="text-muted-foreground block text-3xl">{hint}</span>
                        </span>

                        <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-8 py-4 text-2xl font-semibold shadow-md">
                            Choose
                            <ChevronRight className="size-6" />
                        </span>
                    </button>
                ))}
            </div>

            <div className="px-8 pb-8">
                <BigButton variant="ghost" onClick={() => reset('abandoned')} className="w-full">
                    Cancel
                </BigButton>
            </div>
        </Frame>
    );
}
