/** Labels for every type that may still exist in the database. */
export const deviceTypeLabels: Record<string, string> = {
    kiosk: 'Kiosk',
    pos: 'Register (legacy)',
    kds: 'Kitchen screen',
};

/** Device types that pair with a one-time code (not staff login). */
export const pairableDeviceTypes = ['kiosk', 'kds'] as const;

export type PairableDeviceType = (typeof pairableDeviceTypes)[number];

export const creatableDeviceTypeLabels: Record<PairableDeviceType, string> = {
    kiosk: deviceTypeLabels.kiosk,
    kds: deviceTypeLabels.kds,
};
