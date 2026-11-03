<?php

namespace App\Models;

use App\Enums\PurchaseOrderStatus;
use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['po_number', 'supplier_id', 'status', 'ordered_at', 'expected_at', 'total_cents', 'notes', 'created_by'])]
class PurchaseOrder extends Model
{
    use Audited;

    protected function casts(): array
    {
        return [
            'status' => PurchaseOrderStatus::class,
            'ordered_at' => 'datetime',
            'expected_at' => 'date',
            'total_cents' => 'integer',
        ];
    }

    protected function auditAttributes(): array
    {
        return ['po_number', 'supplier_id', 'status', 'total_cents'];
    }

    protected function auditSubjectName(): string
    {
        return (string) $this->po_number;
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(GoodsReceipt::class);
    }
}
