import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

type Props = { id: string; label: string; error?: string; hint?: string; children: ReactNode };

/** Label + control + inline error, the same layout every inventory form uses. */
export function Field({ id, label, error, hint, children }: Props) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

/** A business-rule refusal from the server arrives under the key `error`. */
export function FormError({ message }: { message?: string }) {
    return message ? <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-2 text-sm">{message}</p> : null;
}
