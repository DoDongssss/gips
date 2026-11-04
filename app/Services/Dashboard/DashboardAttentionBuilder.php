<?php

namespace App\Services\Dashboard;

use App\Services\ConfigurationService;
use Carbon\Carbon;

/** Short “needs attention” items for the dashboard strip (not header bells). */
class DashboardAttentionBuilder
{
    private const MAX = 5;

    /**
     * @param  array<string, bool>  $access
     * @param  array<string, mixed>|null  $live
     * @param  array<string, mixed>|null  $shifts
     * @param  array<string, mixed>|null  $inventory
     * @param  array<string, mixed>|null  $purchasing
     * @param  array<string, mixed>|null  $kiosk
     * @return list<array{id: string, level: string, text: string, href?: string}>
     */
    public function build(array $access, ?array $live, ?array $shifts, ?array $inventory, ?array $purchasing, ?array $kiosk): array
    {
        $out = [];

        if ($access['live'] && $live !== null) {
            $mins = $live['kitchen']['oldest_minutes'] ?? null;
            if ($mins !== null && $mins >= 15) {
                $out[] = [
                    'id' => 'kitchen-wait',
                    'level' => 'danger',
                    'text' => "Oldest kitchen ticket: {$mins} min",
                    'href' => '/kitchen',
                ];
            }
        }

        if ($access['shifts'] && $shifts !== null) {
            $varianceThreshold = (int) app(ConfigurationService::class)->get('shifts_variance_attention_cents');

            foreach ($shifts['open'] as $s) {
                if (Carbon::parse($s['opened_at'])->diffInHours(now()) >= 12) {
                    $out[] = [
                        'id' => 'shift-long-'.$s['id'],
                        'level' => 'warning',
                        'text' => "{$s['cashier']}'s shift open 12+ hours",
                        'href' => route('shifts.show', $s['id']),
                    ];
                }
            }

            foreach ($shifts['closed_today'] as $s) {
                $variance = $s['variance_cents'];
                if ($variance === null || $varianceThreshold <= 0 || abs($variance) < $varianceThreshold) {
                    continue;
                }

                $label = $variance < 0 ? 'short' : 'over';
                $amount = number_format(abs($variance) / 100, 2);

                $out[] = [
                    'id' => 'shift-variance-'.$s['id'],
                    'level' => abs($variance) >= $varianceThreshold * 2 ? 'danger' : 'warning',
                    'text' => "{$s['cashier']}'s shift closed {$label} by ₱{$amount}",
                    'href' => route('shifts.show', $s['id']),
                ];
            }
        }

        if ($access['inventory'] && $inventory !== null) {
            if ($inventory['negative_count'] > 0) {
                $out[] = [
                    'id' => 'stock-negative',
                    'level' => 'danger',
                    'text' => "{$inventory['negative_count']} ingredient(s) below zero",
                    'href' => route('inventory.ingredients.index', ['filter' => 'negative']),
                ];
            } elseif ($inventory['low']['count'] > 0) {
                $out[] = [
                    'id' => 'stock-low',
                    'level' => 'warning',
                    'text' => "{$inventory['low']['count']} ingredient(s) at reorder level",
                    'href' => route('inventory.ingredients.index', ['filter' => 'low']),
                ];
            }
        }

        if ($access['purchasing'] && $purchasing !== null && $purchasing['overdue'] > 0) {
            $out[] = [
                'id' => 'po-overdue',
                'level' => 'warning',
                'text' => "{$purchasing['overdue']} purchase order(s) overdue",
                'href' => route('inventory.purchase-orders.index'),
            ];
        }

        if ($access['kiosk'] && $kiosk !== null && ! ($kiosk['demo'] ?? false)) {
            $offline = count(array_filter(
                $kiosk['devices'],
                fn ($d) => ! $d['online'] && ! $d['out_of_service']
            ));
            if ($offline > 0) {
                $out[] = [
                    'id' => 'kiosk-offline',
                    'level' => 'danger',
                    'text' => "{$offline} kiosk(s) offline",
                    'href' => route('devices.index'),
                ];
            }
        }

        return array_slice($out, 0, self::MAX);
    }
}
