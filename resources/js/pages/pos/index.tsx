import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { configQuery, menuQuery } from '@/lib/pos-api';
import { CartPanel } from '@/pages/pos/cart-panel';
import { CheckoutDialog } from '@/pages/pos/checkout-dialog';
import { ItemDialog } from '@/pages/pos/item-dialog';
import { MenuPanel } from '@/pages/pos/menu-panel';
import type { MenuProduct } from '@/pages/pos/types';
import type { CartLine } from '@/stores/cart-store';
import { useCartStore } from '@/stores/cart-store';
import { usePosUi } from '@/stores/pos-ui-store';

type Picker = { product: MenuProduct; line: CartLine | null };

export default function Index() {
    const menu = useQuery(menuQuery);
    const config = useQuery(configQuery);
    const cart = useCartStore();

    const payingOrder = usePosUi((state) => state.payingOrder);
    const clearPaying = usePosUi((state) => state.clearPaying);
    const openDrawer = usePosUi((state) => state.openDrawer);

    const [picker, setPicker] = useState<Picker | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    const products = new Map((menu.data ?? []).flatMap((category) => category.products).map((product) => [product.id, product]));
    const showCheckout = checkoutOpen || payingOrder !== null;

    function pick(product: MenuProduct) {
        // A plain item with no sizes or add-ons goes straight into the cart.
        if (product.variants.length === 0 && product.groups.length === 0) {
            cart.addLine({
                product_id: product.id,
                name: product.name,
                image_url: product.image_url,
                variant_id: null,
                variant_name: null,
                modifier_ids: [],
                modifier_names: [],
                notes: '',
                quantity: 1,
            });

            return;
        }

        setPicker({ product, line: null });
    }

    function editLine(line: CartLine) {
        const product = products.get(line.product_id);

        if (product) {
            setPicker({ product, line });
        } else {
            toast.error(`${line.name} is no longer on the menu. Remove it from the order.`);
        }
    }

    function closeCheckout() {
        setCheckoutOpen(false);
        clearPaying();
    }

    function saved(orderNumber: string) {
        closeCheckout();
        toast.success(`Order ${orderNumber} saved. Pay it later from Saved orders.`, {
            action: { label: 'Open', onClick: () => openDrawer('unpaid') },
        });
    }

    return (
        <>
            <Head title="Register" />

            <div className="grid h-full overflow-y-auto lg:grid-cols-[minmax(0,2.75fr)_minmax(0,1fr)] lg:overflow-hidden">
                <section className="flex min-h-0 flex-col border-r border-gray-200 bg-white">
                    {menu.isPending && <p className="p-4 text-base text-gray-500">Loading menu…</p>}

                    {menu.isError && (
                        <div className="m-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-base">
                            <p className="text-destructive">The menu could not be loaded.</p>
                            <Button size="sm" variant="outline" onClick={() => menu.refetch()}>
                                Try again
                            </Button>
                        </div>
                    )}

                    {menu.data && <MenuPanel categories={menu.data} onPick={pick} />}
                </section>

                <CartPanel onEditLine={editLine} onCheckout={() => setCheckoutOpen(true)} />
            </div>

            <ItemDialog
                product={picker?.product ?? null}
                line={picker?.line ?? null}
                onClose={() => setPicker(null)}
                onSave={(data) => {
                    if (picker?.line) {
                        cart.updateLine(picker.line.uid, data);
                    } else {
                        cart.addLine(data);
                    }

                    setPicker(null);
                }}
            />

            {showCheckout && <CheckoutDialog key={payingOrder?.id ?? 'cart'} config={config.data} order={payingOrder} onClose={closeCheckout} onSaved={saved} />}
        </>
    );
}
