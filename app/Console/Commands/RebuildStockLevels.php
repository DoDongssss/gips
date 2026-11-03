<?php

namespace App\Console\Commands;

use App\Services\Inventory\StockService;
use Illuminate\Console\Command;

class RebuildStockLevels extends Command
{
    protected $signature = 'inventory:rebuild-stock';

    protected $description = 'Recompute stock_levels from the stock_movements ledger';

    public function handle(StockService $stock): int
    {
        $changed = $stock->rebuild();
        $this->info($changed === 0 ? 'Stock levels already match the ledger.' : "Corrected {$changed} stock level(s).");

        return self::SUCCESS;
    }
}
