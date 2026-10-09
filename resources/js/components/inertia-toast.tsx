import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { Toaster } from '@/components/ui/sonner';

type FlashProps = {
    flash?: {
        success?: string | null;
        error?: string | null;
    };
};

/**
 * Mount once (for example inside AppLayout). It turns backend results into toasts:
 *  - success flash       -> green toast (controller: back()->with('success', '...'))
 *  - error flash         -> red toast   (controller: back()->with('error', '...'))
 *  - validation errors   -> the first error message from Laravel
 *  - non-Inertia replies -> a toast instead of the white debug popup
 *  - network failures    -> a toast
 *
 * If your app already renders a <Toaster />, remove the one at the bottom of this file.
 */
export function InertiaToasts() {
    useEffect(() => {
        // Flash messages from the controller after a successful request.
        const offSuccess = router.on('success', (event) => {
            const flash = (event.detail?.page?.props as FlashProps | undefined)?.flash;

            if (flash?.success) {
                toast.success(flash.success);
            }

            if (flash?.error) {
                toast.error(flash.error);
            }
        });

        // Laravel validation errors (for example "The PIN must be 4 to 6 digits.").
        const offError = router.on('error', (event) => {
            const errors = (event.detail?.errors ?? {}) as Record<string, string>;
            const messages = Object.values(errors).filter(Boolean);

            if (messages.length > 0) {
                toast.error(messages[0]);
            }
        });

        // The server replied with something that is not an Inertia response.
        // Cancelling the event stops the white full-screen popup.
        const offInvalid = router.on('invalid', (event) => {
            event.preventDefault();

            const status = (event.detail as { response?: { status?: number } })?.response?.status;

            if (status === 419) {
                toast.error('Your session expired. Please refresh the page.');
            } else if (status === 403) {
                toast.error("You don't have permission to do that.");
            } else {
                toast.error(`Something went wrong${status ? ` (error ${status})` : ''}. Please try again.`);
            }
        });

        // The request never reached the server (offline, timeout, etc.).
        const offException = router.on('exception', (event) => {
            event.preventDefault();
            toast.error('Could not reach the server. Check your connection and try again.');
        });

        return () => {
            offSuccess();
            offError();
            offInvalid();
            offException();
        };
    }, []);

    return <Toaster richColors position="top-right" />;
}