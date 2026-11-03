<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'contact_person', 'phone', 'email', 'address', 'notes', 'is_active'])]
class Supplier extends Model
{
    use Audited, SoftDeletes;

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    protected function auditAttributes(): array
    {
        return ['name', 'contact_person', 'phone', 'email', 'is_active'];
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(SupplierIngredient::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
