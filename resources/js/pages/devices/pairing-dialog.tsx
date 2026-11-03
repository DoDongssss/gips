import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PairingInfo } from '@/types/devices';

type Props = { pairing: PairingInfo | null; onClose: () => void };

/** Shows the one-time code. Closing it is final: the server keeps only a hash. */
export default function PairingDialog({ pairing, onClose }: Props) {
    const [copied, setCopied] = useState(false);
    const path = pairing?.type === 'kds' ? '/kitchen-screen' : '/kiosk';
    const url = typeof window === 'undefined' ? path : `${window.location.origin}${path}`;

    async function copy() {
        try {
            await navigator.clipboard.writeText(pairing?.code ?? '');
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard can be blocked; the code is on screen anyway.
        }
    }

    return (
        <Dialog open={pairing !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pair {pairing?.device}</DialogTitle>
                    <DialogDescription>Enter this code on the tablet. It works once and expires {pairing ? new Date(pairing.expires_at).toLocaleString() : ''}.</DialogDescription>
                </DialogHeader>

                <div className="bg-muted rounded-lg py-6 text-center">
                    <p className="font-mono text-4xl font-semibold tracking-[0.3em]">{pairing?.code}</p>
                </div>

                <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
                    <li>
                        On the tablet, open <span className="text-foreground font-medium">{url}</span> in the browser.
                    </li>
                    <li>Type the code above and tap Pair.</li>
                    <li>Add the page to the home screen or use full screen, then leave it running.</li>
                </ol>

                <p className="text-destructive text-sm">Copy it now. You will not be able to see this code again; you can only issue a new one.</p>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={copy}>
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy code'}
                    </Button>
                    <Button type="button" onClick={onClose}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
