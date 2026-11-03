export type PrinterConnection = 'browser' | 'usb' | 'bluetooth' | 'serial';

export type PrinterSettings = {
    printer_connection: PrinterConnection;
    printer_name: string | null;
    printer_paper_width: 58 | 80;
    printer_copies: number;
    printer_serial_baud: number;
    printer_auto_print: boolean;
    printer_open_drawer: boolean;
};

export type BusinessInfo = { name: string | null; address: string | null; phone: string | null };
