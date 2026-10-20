/** "just now", "5 min ago", "2 h ago", "3 d ago". */
export function ago(iso: string | null | undefined, now = Date.now()): string {
    if (!iso) return 'never';

    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;

    return `${Math.floor(minutes / 1440)} d ago`;
}

export const deviceTypeLabels: Record<string, string> = { kiosk: 'Kiosk', pos: 'Register', kds: 'Kitchen screen' };
export const screenTypeLabels: Record<string, string> = { welcome: 'Welcome', promo: 'Promo', banner: 'Banner' };
export const channelLabels: Record<string, string> = { all: 'Register and kiosk', pos: 'Register only', kiosk: 'Kiosk only' };

/** Empty string -> null, for optional fields. */
export const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());
