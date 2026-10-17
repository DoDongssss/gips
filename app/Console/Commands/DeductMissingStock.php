<?php

namespace App\Console\Commands;

use App\Jobs\DeductStockForOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeductMissingStock extends Command
{
    protected $signature = 'inventory:deduct-missing {--days=2 : How many business days back to check}';

    protected $description = 'Queue stock deduction for recent paid orders that have none yet (safety net if a job was lost)';

    /**
     * Schedule it every few minutes (routes/console.php):
     *   Schedule::command('inventory:deduct-missing')->everyFiveMinutes()->withoutOverlapping();
     * Re-queuing is harmless: a second run deducts nothing.
     */
    public function handle(): int
    {
        $ids = DB::table('orders')
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['voided', 'cancelled'])
            ->where('business_date', '>=', now()->subDays((int) $this->option('days'))->toDateString())
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('stock_movements as m')
                ->whereColumn('m.reference_id', 'orders.id')
                ->where('m.type', 'sale')
                ->where('m.reference_type', (new \App\Models\Order)->getMorphClass()))
            ->pluck('id');

        foreach ($ids as $id) {
            DeductStockForOrder::dispatch($id);
        }

        $this->info("Queued {$ids->count()} order(s).");

        return self::SUCCESS;
    }
}
