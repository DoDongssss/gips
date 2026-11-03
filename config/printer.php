<?php

/*
 | Receipt printer settings (Settings > Printer). Stored in the same `configurations` table as the other settings
 | (group "printer"), but kept out of config/configurations.php because the Printer page needs a dropdown and a
 | "Connect printer" button that the generic Configuration page cannot draw.
 | Types: string, int, bool.
 */
return [
    'connections' => [
        'browser' => 'Browser print (any printer installed on the computer or tablet)',
        'usb' => 'USB cable (direct)',
        'bluetooth' => 'Bluetooth (printers with Bluetooth LE)',
        'serial' => 'Serial port (USB-serial, or Bluetooth paired as a COM port)',
    ],

    'fields' => [
        'printer_connection' => ['type' => 'string', 'default' => 'browser', 'rules' => ['required', 'in:browser,usb,bluetooth,serial']],
        'printer_name' => ['type' => 'string', 'default' => 'Receipt printer', 'rules' => ['nullable', 'string', 'max:60']],
        'printer_paper_width' => ['type' => 'int', 'default' => 80, 'rules' => ['required', 'integer', 'in:58,80']],
        'printer_copies' => ['type' => 'int', 'default' => 1, 'rules' => ['required', 'integer', 'between:1,3']],
        'printer_serial_baud' => ['type' => 'int', 'default' => 9600, 'rules' => ['required', 'integer', 'in:9600,19200,38400,57600,115200']],
        'printer_auto_print' => ['type' => 'bool', 'default' => true, 'rules' => ['boolean']],
        'printer_open_drawer' => ['type' => 'bool', 'default' => true, 'rules' => ['boolean']],
    ],
];
