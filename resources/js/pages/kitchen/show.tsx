import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { KdsBoard } from '@/components/kitchen/kds-board';
import { index } from '@/routes/kitchen';

type Props = { station: { id: number; name: string; type: string } };

export default function Show({ station }: Props) {
    return (
        <KdsBoard
            station={station}
            leading={
                <Link
                    href={index()}
                    aria-label="All stations"
                    className="flex size-12 items-center justify-center rounded-md bg-white text-slate-900 shadow active:bg-gray-100"
                >
                    <ArrowLeft className="size-6" />
                </Link>
            }
        />
    );
}