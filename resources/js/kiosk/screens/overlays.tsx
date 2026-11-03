import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { BigButton, tintStyle } from '@/kiosk/screens/ui';

function Modal({ children }: { children: ReactNode }) {
    return (
        <div className="animate-in fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 duration-200">
            <div role="alertdialog" aria-modal="true" className="bg-background animate-in zoom-in-95 flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl p-8 text-center shadow-2xl duration-200">
                {children}
            </div>
        </div>
    );
}

/** The warning starts 10 seconds before the reset (see useIdle). */
const WARN_SECONDS = 10;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function IdleWarning({ seconds, onContinue }: { seconds: number; onContinue: () => void }) {
    const fraction = Math.min(Math.max(seconds, 0), WARN_SECONDS) / WARN_SECONDS;

    return (
        <Modal>
            <span className="relative flex size-32 items-center justify-center rounded-full" style={tintStyle('var(--chart-3)')}>
                <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
                    <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" opacity="0.15" />
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
                        className="transition-all duration-500 ease-linear"
                    />
                </svg>
                <span className="text-5xl font-semibold tabular-nums">{seconds}</span>
            </span>
            <div className="space-y-1.5">
                <p className="text-3xl font-semibold tracking-tight">Are you still there?</p>
                <p className="text-muted-foreground text-lg">Your order will be cleared in {seconds}s.</p>
            </div>
            <BigButton onClick={onContinue} className="w-full">
                Keep ordering
            </BigButton>
        </Modal>
    );
}

export function NoticeDialog({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <Modal>
            <span className="flex size-20 items-center justify-center rounded-2xl" style={tintStyle('var(--chart-1)')}>
                <Info className="size-10" />
            </span>
            <p className="text-2xl leading-snug font-semibold">{message}</p>
            <BigButton onClick={onClose} className="w-full">
                OK
            </BigButton>
        </Modal>
    );
}
