import { useEffect, useState } from 'react';

import { useKiosk } from '@/kiosk/store';

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

    const banner = banners.length > 0 ? banners[index % banners.length] : null;

    return (
        <button type="button" onClick={() => void begin()} className="bg-primary text-primary-foreground relative flex h-full w-full flex-col items-center justify-end overflow-hidden text-center select-none">
            {banners.map((b, i) =>
                b.image_url ? (
                    <img key={b.id} src={b.image_url} alt="" draggable={false} className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${i === index % banners.length ? 'opacity-100' : 'opacity-0'}`} />
                ) : null,
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="relative z-10 w-full space-y-3 px-8 pt-10 pb-16 text-white">
                {banner?.content?.headline && <p className="text-5xl leading-tight font-extrabold drop-shadow">{banner.content.headline}</p>}
                {banner?.content?.subtext && <p className="text-2xl drop-shadow">{banner.content.subtext}</p>}
                {!banner?.content?.headline && <p className="text-5xl leading-tight font-extrabold drop-shadow">{message || 'Welcome! Tap to order'}</p>}

                <p className="mt-6 inline-block animate-pulse rounded-full bg-white px-10 py-4 text-2xl font-bold text-black">Touch to start</p>
            </div>
        </button>
    );
}
