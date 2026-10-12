import { Head } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRealtimeRefetch } from '@/hooks/use-realtime';
import { kdsClient } from '@/lib/kds';
import type { KdsTicket } from '@/lib/kds';
import { errorList, PosHttpError } from '@/lib/pos-http';
import type { ReactNode } from 'react';

type Props = {
    station: { id: number; name: string; type: string };
    /** Set for a paired kitchen screen; staff use their session instead. */
    token?: string;
    /** What sits left of the station name: a back link for staff, a sign-out for a paired screen. */
    leading: ReactNode;
    /** The server refused the token (screen switched off or unpaired). */
    onUnauthorized?: () => void;
};

type Tone = 'ok' | 'warning' | 'late';

const TONE_CLASS: Record<Tone, string> = {
    ok: 'border-gray-200 bg-white',
    warning: 'border-amber-300 bg-amber-50',
    late: 'border-red-300 bg-red-50',
};

const TIMER_CLASS: Record<Tone, string> = {
    ok: 'bg-gray-100 text-gray-700',
    warning: 'bg-amber-100 text-amber-800',
    late: 'bg-red-100 text-red-700',
};

function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);

        return () => window.clearInterval(timer);
    }, [intervalMs]);

    return now;
}

function clock(totalSeconds: number): string {
    const seconds = Math.max(0, totalSeconds);

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** A short two-note chime. The audio context only starts after the first tap on the sound button. */
function chime(context: AudioContext): void {
    [880, 1175].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.18;

        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
    });
}

export function KdsBoard({ station, token, leading, onUnauthorized }: Props) {
    const queryClient = useQueryClient();
    const client = kdsClient(station.id, token);
    const boardQuery = client.boardQuery;
    const { data, isPending, isError, error, dataUpdatedAt } = useQuery(boardQuery);

    useEffect(() => {
        if (error instanceof PosHttpError && (error.status === 401 || error.status === 403)) {
            onUnauthorized?.();
        }
    }, [error, onUnauthorized]);
    const now = useNow(1000);

    useRealtimeRefetch(`kds.station.${station.id}`, 'ticket.updated', boardQuery.queryKey);

    // The kitchen tablet's clock may be off: measure the gap against the server when data arrives.
    const clockOffset = useMemo(
        () => (data ? new Date(data.server_time).getTime() - dataUpdatedAt : 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data?.server_time, dataUpdatedAt],
    );

    const [soundOn, setSoundOn] = useState(false);
    const audio = useRef<AudioContext | null>(null);
    const seen = useRef<Set<number> | null>(null);

    useEffect(() => {
        if (!data) {
            return;
        }

        const ids = new Set(data.tickets.map((ticket) => ticket.id));

        if (seen.current && data.tickets.some((ticket) => !seen.current!.has(ticket.id)) && soundOn && audio.current) {
            chime(audio.current);
        }

        seen.current = ids;
    }, [data, soundOn]);

    function toggleSound() {
        if (!soundOn) {
            audio.current ??= new AudioContext();
            void audio.current.resume();
            chime(audio.current);
        }

        setSoundOn((on) => !on);
    }

    const run = useMutation({
        mutationFn: (action: () => Promise<unknown>) => action(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: boardQuery.queryKey }),
        onError: (error) => {
            errorList(error).forEach((message) => toast.error(message));
            void queryClient.invalidateQueries({ queryKey: boardQuery.queryKey });
        },
    });

    const tickets = data?.tickets ?? [];
    const thresholds = data?.thresholds ?? { warning_minutes: 5, late_minutes: 10 };

    function tone(ticket: KdsTicket): Tone {
        const minutes = (now + clockOffset - new Date(ticket.fired_at ?? now).getTime()) / 60_000;

        if (minutes >= thresholds.late_minutes) {
            return 'late';
        }

        return minutes >= thresholds.warning_minutes ? 'warning' : 'ok';
    }

    return (
        <>
            <Head title={`${station.name} display`} />

            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                    {leading}
                    <h1 className="text-2xl font-semibold">{station.name}</h1>
                    <span className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-lg tabular-nums">
                        {tickets.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="h-12 border-gray-300 bg-white px-5 text-base text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        disabled={!data?.can_recall || run.isPending}
                        onClick={() => run.mutate(() => client.recall())}
                    >
                        <RotateCcw className="size-5" /> Recall last
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-12 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        onClick={toggleSound}
                        aria-label={soundOn ? 'Turn the new-ticket sound off' : 'Turn the new-ticket sound on'}
                    >
                        {soundOn ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
                    </Button>
                </div>
            </header>

            {isError && (
                <div className="bg-red-50 text-red-700 px-4 py-2 text-center text-base font-medium">
                    Cannot reach the server. Showing the last tickets; retrying every few seconds.
                </div>
            )}

            <main className="min-h-0 flex-1 overflow-y-auto p-4">
                {isPending && <p className="py-20 text-center text-xl text-gray-500">Loading tickets�</p>}

                {!isPending && tickets.length === 0 && (
                    <p className="py-20 text-center text-2xl text-gray-400">No open tickets. All caught up.</p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {tickets.map((ticket) => {
                        const level = tone(ticket);
                        const elapsed = Math.floor(
                            (now + clockOffset - new Date(ticket.fired_at ?? now).getTime()) / 1000,
                        );

                        return (
                            <section
                                key={ticket.id}
                                className={`flex flex-col rounded-xl border-2 ${TONE_CLASS[level]}`}
                            >
                                <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-3">
                                    <div>
                                        <p className="text-3xl leading-none font-bold">{ticket.order.order_number}</p>
                                        <p className="mt-1 text-base text-gray-500">
                                            {ticket.order.type === 'dine_in' ? 'Dine in' : 'Takeout'}
                                            {ticket.order.customer_name && ` � ${ticket.order.customer_name}`}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-lg px-3 py-1.5 text-2xl font-semibold tabular-nums ${TIMER_CLASS[level]}`}
                                    >
                                        {clock(elapsed)}
                                    </span>
                                </div>

                                {ticket.order.notes && (
                                    <p className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-base text-amber-700">
                                        {ticket.order.notes}
                                    </p>
                                )}

                                <ul className="flex-1 divide-y divide-gray-100">
                                    {ticket.items.map((item) => {
                                        const done = item.status === 'bumped';

                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    disabled={done || run.isPending}
                                                    onClick={() => run.mutate(() => client.bumpItem(item.id))}
                                                    className="flex min-h-16 w-full items-start gap-3 p-3 text-left active:bg-gray-50 disabled:opacity-100"
                                                >
                                                    <span
                                                        className={`mt-0.5 text-2xl font-bold tabular-nums ${done ? 'text-gray-400' : ''}`}
                                                    >
                                                        {item.quantity}�
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span
                                                            className={`block text-xl leading-snug font-medium ${done ? 'text-gray-400 line-through' : ''}`}
                                                        >
                                                            {item.name}
                                                        </span>
                                                        {item.modifiers_summary && (
                                                            <span className="block text-base text-gray-500">
                                                                {item.modifiers_summary}
                                                            </span>
                                                        )}
                                                        {item.notes && (
                                                            <span className="block text-base text-amber-700">
                                                                {item.notes}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {done && <Check className="size-6 shrink-0 text-green-500" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div
                                    className={`grid gap-2 p-3 ${ticket.status === 'new' ? 'grid-cols-2' : 'grid-cols-1'}`}
                                >
                                    {ticket.status === 'new' && (
                                        <Button
                                            variant="outline"
                                            className="h-14 border-gray-300 bg-white text-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                            disabled={run.isPending}
                                            onClick={() => run.mutate(() => client.start(ticket.id))}
                                        >
                                            <Play className="size-5" /> Start
                                        </Button>
                                    )}
                                    <Button
                                        className="h-14 bg-green-600 text-lg text-white hover:bg-green-700"
                                        disabled={run.isPending}
                                        onClick={() => run.mutate(() => client.bumpTicket(ticket.id))}
                                    >
                                        <Check className="size-6" /> Bump
                                    </Button>
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </>
    );
}
