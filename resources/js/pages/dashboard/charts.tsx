import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

/** Round a maximum up to a tidy axis value: 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceMax(value: number): number {
    if (value <= 0) return 100;

    const pow = 10 ** Math.floor(Math.log10(value));
    const n = value / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;

    return step * pow;
}

export type SeriesPoint = { label: string; value: number; prev?: number; note?: string };

/**
 * Line + area chart with an optional dashed "previous period" line and a hover read-out.
 * Plain SVG, so it needs no chart library and follows the theme through currentColor.
 */
export function AreaChart({ points, format, axisFormat, labelEvery = 1, className }: { points: SeriesPoint[]; format: (n: number) => string; axisFormat: (n: number) => string; labelEvery?: number; className?: string }) {
    const gradient = useId();
    const [hover, setHover] = useState<number | null>(null);

    const W = 640;
    const H = 230;
    const pad = { l: 46, r: 10, t: 10, b: 24 };
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;

    const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.value, p.prev ?? 0))));
    const x = (i: number) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => pad.t + innerH - (v / max) * innerH;

    const line = (get: (p: SeriesPoint) => number) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(get(p)).toFixed(1)}`).join(' ');
    const area = `${line((p) => p.value)} L${x(points.length - 1).toFixed(1)},${pad.t + innerH} L${x(0).toFixed(1)},${pad.t + innerH} Z`;
    const hasPrev = points.some((p) => (p.prev ?? 0) > 0);
    const ticks = [0, 0.25, 0.5, 0.75, 1];

    function move(e: React.MouseEvent<SVGSVGElement>) {
        const box = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - box.left) / box.width) * W;
        const i = Math.round(((px - pad.l) / innerW) * (points.length - 1));
        setHover(Math.min(points.length - 1, Math.max(0, i)));
    }

    const active = hover === null ? null : points[hover];

    return (
        <div className={cn('relative', className)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="text-primary h-auto w-full" onMouseMove={move} onMouseLeave={() => setHover(null)} role="img" aria-label="Sales over time">
                <defs>
                    <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} className="stroke-border" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 4'} />
                        <text x={pad.l - 8} y={y(max * t) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
                            {axisFormat(max * t)}
                        </text>
                    </g>
                ))}

                {points.map((p, i) =>
                    i % labelEvery === 0 ? (
                        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                            {p.label}
                        </text>
                    ) : null,
                )}

                {hasPrev && <path d={line((p) => p.prev ?? 0)} fill="none" className="stroke-muted-foreground/60" strokeWidth="1.5" strokeDasharray="4 4" />}
                <path d={area} fill={`url(#${gradient})`} />
                <path d={line((p) => p.value)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                {hover !== null && active && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} className="stroke-muted-foreground/50" strokeWidth="1" />
                        <circle cx={x(hover)} cy={y(active.value)} r="4" fill="currentColor" className="stroke-background" strokeWidth="2" />
                    </g>
                )}
            </svg>

            {hover !== null && active && (
                <div
                    className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
                    style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length * 0.65 ? '-105%' : '8px'})` }}
                >
                    <p className="font-medium">{active.label}</p>
                    <p className="tabular-nums">{format(active.value)}</p>
                    {active.note && <p className="text-muted-foreground">{active.note}</p>}
                    {hasPrev && <p className="text-muted-foreground tabular-nums">Before: {format(active.prev ?? 0)}</p>}
                </div>
            )}
        </div>
    );
}

/** Vertical bars, one per label (busiest hours). The tallest bar is highlighted. */
export function ColumnChart({ bars, format, labelEvery = 3 }: { bars: { label: string; value: number }[]; format: (n: number) => string; labelEvery?: number }) {
    const max = Math.max(1, ...bars.map((b) => b.value));
    const top = bars.reduce((best, b, i) => (b.value > bars[best].value ? i : best), 0);

    return (
        <div>
            <div className="flex h-36 items-end gap-1">
                {bars.map((b, i) => (
                    <div key={i} className="group relative flex h-full flex-1 items-end" title={`${b.label}: ${format(b.value)}`}>
                        <div
                            className={cn('w-full rounded-t-sm transition-colors', b.value === 0 ? 'bg-muted' : i === top ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70')}
                            style={{ height: `${Math.max(b.value === 0 ? 2 : 6, (b.value / max) * 100)}%` }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-1">
                {bars.map((b, i) => (
                    <span key={i} className="text-muted-foreground flex-1 text-center text-[10px]">
                        {i % labelEvery === 0 ? b.label : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** Horizontal bars with a label and a value; the widest bar is 100%. */
export function BarList({ rows, empty = 'No data yet.' }: { rows: { label: string; value: number; display: string; sub?: string }[]; empty?: string }) {
    const max = Math.max(1, ...rows.map((r) => r.value));

    if (rows.length === 0) {
        return <p className="text-muted-foreground py-6 text-center text-sm">{empty}</p>;
    }

    return (
        <ul className="space-y-3">
            {rows.map((r, i) => (
                <li key={`${r.label}-${i}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{r.label}</span>
                        <span className="shrink-0 font-medium tabular-nums">{r.display}</span>
                    </div>
                    <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
                    </div>
                    {r.sub && <p className="text-muted-foreground mt-0.5 text-xs">{r.sub}</p>}
                </li>
            ))}
        </ul>
    );
}

/** One bar split into shares (channels, order types). */
export function ShareBar({ parts }: { parts: { label: string; value: number; display: string }[] }) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    const shades = ['bg-primary', 'bg-primary/60', 'bg-primary/35', 'bg-primary/20'];

    if (total === 0) {
        return <p className="text-muted-foreground py-3 text-center text-sm">No data yet.</p>;
    }

    return (
        <div>
            <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
                {parts.map((p, i) => (
                    <div key={p.label} className={shades[Math.min(i, shades.length - 1)]} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.display}`} />
                ))}
            </div>
            <ul className="mt-3 space-y-1.5">
                {parts.map((p, i) => (
                    <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className={cn('size-2.5 shrink-0 rounded-sm', shades[Math.min(i, shades.length - 1)])} />
                            <span className="truncate">{p.label}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                            {Math.round((p.value / total) * 100)}% · {p.display}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
