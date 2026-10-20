import { ShoppingBag, UtensilsCrossed } from 'lucide-react';

import { useKiosk } from '@/kiosk/store';
import { BigButton, Frame, TopBar } from '@/kiosk/screens/ui';
import type { OrderType } from '@/kiosk/types';

const options: { type: OrderType; label: string; hint: string; icon: typeof ShoppingBag }[] = [
    { type: 'dine_in', label: 'Dine in', hint: 'Eat here', icon: UtensilsCrossed },
    { type: 'takeout', label: 'Takeout', hint: 'Take it with you', icon: ShoppingBag },
];

export default function OrderTypeScreen() {
    const chooseType = useKiosk((s) => s.chooseType);
    const reset = useKiosk((s) => s.reset);

    return (
        <Frame>
            <TopBar title="How would you like your order?" onBack={() => reset('abandoned')} />
            <div className="grid flex-1 grid-cols-2 gap-6 p-8">
                {options.map(({ type, label, hint, icon: Icon }) => (
                    <button key={type} type="button" onClick={() => chooseType(type)} className="bg-card border-border flex flex-col items-center justify-center gap-4 rounded-3xl border-2 shadow-sm transition-transform active:scale-[0.98]">
                        <Icon className="text-primary size-24" strokeWidth={1.5} />
                        <span className="text-4xl font-bold">{label}</span>
                        <span className="text-muted-foreground text-xl">{hint}</span>
                    </button>
                ))}
            </div>
            <div className="p-6 pt-0">
                <BigButton variant="ghost" onClick={() => reset('abandoned')} className="w-full">
                    Cancel
                </BigButton>
            </div>
        </Frame>
    );
}
