# Production operations — backups, scheduler, realtime

## Database backup

### Manual

```bash
php artisan backup:database
```

Backups are written to `storage/backups/`:

- SQLite: `sqlite-YYYY-mm-dd_His.sqlite`
- MySQL: `mysql-YYYY-mm-dd_His.sql` (requires `mysqldump` on PATH)

Copy backups off the server (S3, NAS, or your host’s snapshot tool). The app does not upload them for you.

### Scheduled

`routes/console.php` runs `backup:database` daily at 02:30. On the server, ensure Laravel’s scheduler is running:

```bash
* * * * * cd /path/to/gip-system && php artisan schedule:run >> /dev/null 2>&1
```

## Scheduler tasks

| Command | Frequency | Purpose |
| --- | --- | --- |
| `backup:database` | Daily 02:30 | Database file dump |
| `activitylog:clean` | Daily | Trim old activity log rows |
| `model:prune` | Daily | Prune expired models (e.g. idempotency keys, kiosk heartbeats) |
| `inventory:deduct-missing` | Every 5 min | Catch-up stock deduction safety net |
| `devices:watch` | Every minute | Device offline detection |
| `kiosk:maintain` | Every minute | Kiosk session housekeeping |

## Live updates (Pusher)

Default `.env` uses `BROADCAST_CONNECTION=log`, which disables websocket updates. For production:

1. Create a Pusher (or compatible) app.
2. Set in `.env`:

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=ap1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

3. Rebuild frontend assets: `npm run build`
4. Confirm the dashboard shows **Live** (green dot), not “Manual refresh”.

## Public registration

Self-service signup is **disabled** (`Features::registration()` is commented in `config/fortify.php`). The `/register` URL returns 404. Create staff only under **Administration → User**.

## Restore (SQLite)

1. Stop traffic to the app (maintenance mode: `php artisan down`).
2. Replace `database/database.sqlite` with a backup copy.
3. `php artisan up`

## Restore (MySQL)

```bash
mysql -u USER -p DATABASE < storage/backups/mysql-YYYY-mm-dd_His.sql
```

Verify migrations: `php artisan migrate --force`
