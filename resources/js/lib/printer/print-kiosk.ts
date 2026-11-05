import { configureDevice } from '@/lib/printer/device-choice';
import { kioskTicket } from '@/lib/printer/kiosk-ticket';
import { print, restore } from '@/lib/printer/printer';
import type { PlacedOrder } from '@/types/kiosk';
import type { BusinessInfo, PrinterSettings } from '@/types/printer';

export type KioskPrinterConfig = {
    settings: PrinterSettings;
    business: BusinessInfo;
};

/** Silent / RawBT-friendly ticket when the customer finishes on the kiosk. Never opens the cash drawer. */
export async function printKioskTicket(placed: PlacedOrder, config: KioskPrinterConfig): Promise<void> {
    const { settings, business } = config;

    if (!settings.printer_kiosk_auto_print) {
        return;
    }

    const device = configureDevice(settings);
    await restore();

    await print(kioskTicket(placed, business, device), device.printer_copies);
}
