import { ArrowRight, Banknote, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useKiosk } from '@/kiosk/store';
import { cn } from '@/lib/utils';

const ROTATE_MS = 7_000;

/** Idle screen: promo banners rotate behind a "touch to start" prompt. The whole screen is the button. */
export default function Welcome() {
    const banners = useKiosk((s) => s.banners);
    const message = useKiosk((s) => s.status?.settings?.welcome_message);
    const begin = useKiosk((s) => s.begin);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (banners.length < 2) return;

        const timer = window.setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);

        return () => window.clearInterval(timer);
    }, [banners.length]);

    const active = banners.length > 0 ? index % banners.length : 0;
    const banner = banners.length > 0 ? banners[active] : null;
    const hasImages = banners.some((b) => b.image_url);

    return (
        <button type="button" onClick={() => void begin()} className="bg-primary text-primary-foreground relative flex h-full w-full flex-col overflow-hidden text-left select-none">
            {banners.map((b, i) =>
                b.image_url ? (
                    <img key={b.id} src={b.image_url} alt="" draggable={false} className={cn('absolute inset-0 size-full object-cover transition-opacity duration-1000', i === active ? 'opacity-100' : 'opacity-0')} />
                ) : null,
            )}

            {hasImages ? (
                // Dark at the bottom where the words are, lighter on top so the picture still shows
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
            ) : (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-32 -right-32 size-[40rem] rounded-full bg-white/5" />
                    <div className="absolute -bottom-48 -left-24 size-[46rem] rounded-full bg-white/5" />
                </div>
            )}

            <div className="relative z-10 flex flex-1 flex-col justify-between p-12 text-white portrait:p-16">
                <div className="flex items-center gap-3 self-start rounded-full bg-white/15 px-6 py-3 text-xl font-medium backdrop-blur">
                    <UtensilsCrossed className="size-6" />
                    Self-order kiosk
                </div>

                <div key={banner?.id ?? 'message'} className="animate-in fade-in slide-in-from-bottom-4 space-y-12 duration-700">
                    <div className="max-w-4xl space-y-5">
                        <p className="text-7xl leading-[1.02] font-semibold tracking-tight portrait:text-9xl">{banner?.content?.headline || message || 'Welcome! Tap to order'}</p>
                        {banner?.content?.headline && banner.content.subtext && <p className="text-3xl text-white/85 portrait:text-5xl">{banner.content.subtext}</p>}
                    </div>

                    <div className="flex items-center justify-between gap-6">
                        <div className="space-y-5">
                            <span className="relative inline-flex">
                                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-white/30 [animation-duration:2.5s]" />
                                <span className="relative inline-flex items-center gap-4 rounded-full bg-white px-12 py-6 text-3xl font-semibold text-[var(--navy)] shadow-2xl portrait:px-16 portrait:py-8 portrait:text-5xl">
                                    Touch to start
                                    <ArrowRight className="size-8 portrait:size-12" />
                                </span>
                            </span>
                            <p className="flex items-center gap-2 text-xl text-white/75 portrait:text-2xl">
                                <Banknote className="size-6" />
                                Dine in or takeout · Pay at the counter
                            </p>
                        </div>

                        {banners.length > 1 && (
                            <div className="flex items-center gap-2" aria-hidden>
                                {banners.map((b, i) => (
                                    <span key={b.id} className={cn('h-2.5 rounded-full transition-all duration-500', i === active ? 'w-10 bg-white' : 'w-2.5 bg-white/40')} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
