import MenuScreen from '@/kiosk/screens/menu';

/**
 * The order is reviewed in a drawer on the menu screen, so the "cart" step is the menu with the drawer open.
 * The store sends the customer here after a failed order or when coming back from the upsell step.
 */
export default function CartScreen() {
    return <MenuScreen openCart />;
}
