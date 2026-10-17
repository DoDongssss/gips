<?php

namespace App\Services\Inventory;

use App\Models\UnitConversion;
use App\Support\Qty;
use DomainException;

class UnitConverter
{
    /** @var array<int, array<int, float>>|null from => [to => factor], both directions */
    private ?array $graph = null;

    public function flush(): void
    {
        $this->graph = null;
    }

    /** Multiplier that turns a quantity in $from into $to. Throws when the units are unrelated. */
    public function factor(int $from, int $to): float
    {
        if ($from === $to) {
            return 1.0;
        }

        $graph = $this->graph();

        // Breadth-first search so bottle -> ml -> l works from two stored rows.
        $seen = [$from => 1.0];
        $queue = [$from];

        while ($queue) {
            $current = array_shift($queue);

            foreach ($graph[$current] ?? [] as $next => $factor) {
                if (isset($seen[$next])) {
                    continue;
                }

                $seen[$next] = $seen[$current] * $factor;

                if ($next === $to) {
                    return $seen[$next];
                }

                $queue[] = $next;
            }
        }

        throw new DomainException("No conversion from unit #{$from} to unit #{$to}.");
    }

    public function convert(float|int|string $quantity, int $from, int $to): float
    {
        return Qty::round((float) $quantity * $this->factor($from, $to));
    }

    public function canConvert(int $from, int $to): bool
    {
        try {
            $this->factor($from, $to);

            return true;
        } catch (DomainException) {
            return false;
        }
    }

    private function graph(): array
    {
        if ($this->graph !== null) {
            return $this->graph;
        }

        $graph = [];

        foreach (UnitConversion::query()->get(['from_unit_id', 'to_unit_id', 'factor']) as $row) {
            $factor = (float) $row->factor;

            if ($factor <= 0) {
                continue;
            }

            $graph[$row->from_unit_id][$row->to_unit_id] = $factor;
            $graph[$row->to_unit_id][$row->from_unit_id] ??= 1 / $factor;
        }

        return $this->graph = $graph;
    }
}
