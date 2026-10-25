import type { KioskSettings } from '@/types/kiosk';

export type DeviceRow = {
    id: number;
    name: string;
    type: 'kiosk' | 'pos' | 'kds';
    station_id: number | null;
    is_active: boolean;
    paired: boolean;
    online: boolean;
    last_seen_at: string | null;
    app_version: string | null;
    ip_address: string | null;
    has_pending_code: boolean;
    sessions_today: number;
    settings: KioskSettings | null;
};

/** Flashed once after a device is added or a new code is issued. The only time the plain code is visible. */
export type PairingInfo = { device: string; type?: 'kiosk' | 'pos' | 'kds'; code: string; expires_at: string };

export type Station = { id: number; name: string };
