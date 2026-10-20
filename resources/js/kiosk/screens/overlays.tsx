import { BigButton } from '@/kiosk/screens/ui';

function Modal({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div role="alertdialog" aria-modal="true" className="bg-background w-full max-w-xl space-y-5 rounded-3xl p-8 text-center shadow-2xl">
                {children}
            </div>
        </div>
    );
}

export function IdleWarning({ seconds, onContinue }: { seconds: number; onContinue: () => void }) {
    return (
        <Modal>
            <p className="text-3xl font-bold">Are you still there?</p>
            <p className="text-muted-foreground text-xl">Your order will be cleared in {seconds}s.</p>
            <BigButton onClick={onContinue} className="w-full">
                Keep ordering
            </BigButton>
        </Modal>
    );
}

export function NoticeDialog({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <Modal>
            <p className="text-2xl font-semibold">{message}</p>
            <BigButton onClick={onClose} className="w-full">
                OK
            </BigButton>
        </Modal>
    );
}
