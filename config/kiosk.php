<?php

return [
    // Unpaid kiosk orders (pay at counter) are cancelled after this long.
    'unpaid_expiry_minutes' => (int) env('KIOSK_UNPAID_EXPIRY_MINUTES', 30),

    // A kiosk that has not pinged for this long raises a notification.
    'offline_after_minutes' => (int) env('KIOSK_OFFLINE_AFTER_MINUTES', 2),

    // An "active" customer session this old is closed as timed out.
    'stale_session_minutes' => (int) env('KIOSK_STALE_SESSION_MINUTES', 15),

    // A pairing code works once, for this many hours.
    'pairing_code_ttl_hours' => (int) env('KIOSK_PAIRING_TTL_HOURS', 24),

    'heartbeat_retention_days' => 7,

    // The email of the locked system user that kiosk orders are recorded under.
    'actor_email' => 'kiosk@system.local',
];
