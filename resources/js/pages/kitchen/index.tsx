import { Head, Link } from '@inertiajs/react';
import { ChefHat } from 'lucide-react';

import { show } from '@/routes/kitchen';

type Props = { stations: { id: number; name: string; type: string }[] };

export default function Index({ stations }: Props) {
    return (
        <>
            <Head title="Kitchen display" />

            <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
                <div className="text-center">
                    <ChefHat className="mx-auto mb-3 size-12 text-gray-500" />
                    <h1 className="text-3xl font-semibold">Kitchen display</h1>
                    <p className="mt-1 text-lg text-gray-500">Choose the station this screen is for.</p>
                </div>

                {stations.length === 0 ? (
                    <p className="text-lg text-gray-400">No stations yet. Ask the owner to add them under Settings.</p>
                ) : (
                    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
                        {stations.map((station) => (
                            <Link
                                key={station.id}
                                href={show(station.id)}
                                className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-8 text-center text-2xl font-semibold hover:border-gray-400 active:bg-gray-50"
                            >
                                {station.name}
                            </Link>
                        ))}
                    </div>
                )}

                <Link href="/dashboard" className="text-base text-gray-500 underline-offset-4 hover:underline">
                    Back to dashboard
                </Link>
            </main>
        </>
    );
}
