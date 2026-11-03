import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type AuditChange = {
    field: string;
    old: unknown;
    new: unknown;
};

export type AuditLogRow = {
    id: number;
    created_at: string | null;
    log: string | null;
    event: string | null;
    description: string;
    causer: string | null;
    subject_type: string | null;
    subject_name: string | null;
    ip: string | null;
    user_agent: string | null;
    changes: AuditChange[];
    details: Record<string, unknown>;
};

export function formatEventName(value: string | null): string {
    if (!value) {
        return '—';
    }

    const text = value.replace(/[_-]+/g, ' ').trim();

    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '(empty)';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

export function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="col-span-2 break-words">{children}</dd>
        </div>
    );
}

type Props = {
    log: AuditLogRow | null;
    onClose: () => void;
};

export function DetailDialog({ log, onClose }: Props) {
    const details = log ? Object.entries(log.details) : [];

    return (
        <Dialog open={log !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                {log && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{formatEventName(log.event)}</DialogTitle>
                            <DialogDescription>{log.description}</DialogDescription>
                        </DialogHeader>

                        <dl className="divide-y">
                            <Row label="When">
                                <span suppressHydrationWarning>{formatDateTime(log.created_at)}</span>
                            </Row>
                            <Row label="Who">{log.causer ?? 'System'}</Row>
                            <Row label="Area">{formatEventName(log.log)}</Row>
                            <Row label="Record">
                                {log.subject_type ? `${log.subject_type}${log.subject_name ? ` — ${log.subject_name}` : ''}` : '—'}
                            </Row>
                            <Row label="IP address">{log.ip ?? '—'}</Row>
                            <Row label="Device">{log.user_agent ?? '—'}</Row>
                        </dl>

                        {log.changes.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">What changed</h3>
                                <div className="overflow-hidden rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-left">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Field</th>
                                                <th className="px-3 py-2 font-medium">Before</th>
                                                <th className="px-3 py-2 font-medium">After</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {log.changes.map((change) => (
                                                <tr key={change.field}>
                                                    <td className="px-3 py-2">{formatEventName(change.field)}</td>
                                                    <td className="px-3 py-2 text-muted-foreground">{formatValue(change.old)}</td>
                                                    <td className="px-3 py-2">{formatValue(change.new)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {details.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">More details</h3>
                                <dl className="divide-y rounded-md border px-3">
                                    {details.map(([key, value]) => (
                                        <Row key={key} label={formatEventName(key)}>
                                            {formatValue(value)}
                                        </Row>
                                    ))}
                                </dl>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}