import { Frame } from '@/kiosk/screens/ui';

export default function ClosedScreen({ message }: { message?: string | null }) {
    return (
        <Frame className="items-center justify-center gap-4 p-8 text-center">
            <p className="text-5xl font-bold">Sorry, we are not taking orders here right now</p>
            <p className="text-muted-foreground text-2xl">{message ?? 'Please order at the counter.'}</p>
        </Frame>
    );
}
