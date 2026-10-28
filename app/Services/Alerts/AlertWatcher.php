<?php

namespace App\Services\Alerts;

use App\Events\AlertsChanged;
use App\Services\Devices\DeviceAlerts;
use App\Services\PrinterStatusService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Pushes to the headers and the dashboard only when an alert set actually changed since the last check,
 * and sends ONE message for everything that changed in the same check.
 * The state is remembered after a successful push, so a Pusher hiccup is retried on the next run.
 */
class AlertWatcher
{
    public const KINDS = ['devices', 'printers', 'stock'];

    public function __construct(private DeviceAlerts $devices, private PrinterStatusService $printers) {}

    /** @return array<string, bool> kind => pushed */
    public function checkAll(): array
    {
        return $this->check(self::KINDS);
    }

    public function checkDevices(): bool
    {
        return $this->check(['devices'])['devices'];
    }

    public function checkPrinters(): bool
    {
        return $this->check(['printers'])['printers'];
    }

    public function checkStock(): bool
    {
        return $this->check(['stock'])['stock'];
    }

    /**
     * @param  array<int, string>  $kinds
     * @return array<string, bool> kind => changed and pushed
     */
    public function check(array $kinds): array
    {
        $result = array_fill_keys($kinds, false);
        $counts = [];
        $states = [];

        foreach ($kinds as $kind) {
            [$signature, $count] = $this->snapshot($kind);
            $state = sha1($signature);

            if (Cache::get("alerts:state:{$kind}") !== $state) {
                $counts[$kind] = $count;
                $states[$kind] = $state;
            }
        }

        if ($counts === []) {
            return $result;
        }

        try {
            event(new AlertsChanged($counts));
        } catch (\Throwable $e) {
            report($e);

            return $result;
        }

        foreach ($states as $kind => $state) {
            Cache::forever("alerts:state:{$kind}", $state);
            $result[$kind] = true;
        }

        return $result;
    }

    /** @return array{0: string, 1: int} a signature that changes when the set changes, and the count */
    private function snapshot(string $kind): array
    {
        if ($kind === 'devices') {
            $items = $this->devices->offline();

            return [$items->pluck('id')->sort()->implode(','), $items->count()];
        }

        if ($kind === 'printers') {
            $items = collect($this->printers->problems());

            return [$items->pluck('id')->sort()->implode(','), $items->count()];
        }

        $rows = DB::table('ingredients as i')
            ->join('stock_levels as s', 's.ingredient_id', '=', 'i.id')
            ->where('i.is_active', true)->where('i.reorder_level', '>', 0)
            ->whereColumn('s.quantity', '<=', 'i.reorder_level')
            ->orderBy('i.id')
            ->get(['i.id', 's.quantity']);

        // The quantity is part of the signature so the list refreshes when a low item drops further.
        return [$rows->map(fn ($r) => $r->id.':'.(float) $r->quantity)->implode(','), $rows->count()];
    }
}
