import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { KdsBoard } from '@/components/kitchen/kds-board';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/kitchen';

type Props = { station: { id: number; name: string; type: string } };

export default function Show({ station }: Props) {
    return (
        <KdsBoard
            station={station}
            leading={
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-12 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <Link href={index()} aria-label="All stations">
                        <ArrowLeft className="size-6" />
                    </Link>
                </Button>
            }
        />
    );
}
