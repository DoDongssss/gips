export type UnitType = 'weight' | 'volume' | 'count';

export type Unit = { id: number; name: string; abbreviation: string; type: UnitType };

export type Conversion = {
    id: number;
    from: { id: number; name: string; abbreviation: string };
    to: { id: number; name: string; abbreviation: string };
    factor: string;
};

export type IngredientCategory = { id: number; name: string; sort_order: number };

export type IngredientRow = {
    id: number;
    name: string;
    sku: string | null;
    category: { id: number; name: string } | null;
    ingredient_category_id: number | null;
    base_unit: { id: number; name: string; abbreviation: string };
    base_unit_id: number;
    purchase_unit: { id: number; name: string; abbreviation: string } | null;
    purchase_unit_id: number | null;
    /** Decimal strings, base unit. */
    quantity: string;
    reorder_level: string;
    average_cost_cents: string;
    is_active: boolean;
    is_negative: boolean;
    is_low: boolean;
};

/** One entry from GET inventory/ingredients/options. */
export type IngredientOption = {
    id: number;
    name: string;
    base_unit_id: number;
    base_unit: string;
    base_unit_type: UnitType;
    purchase_unit_id: number | null;
    quantity: string;
    average_cost_cents: string;
};

export type IngredientOptions = { ingredients: IngredientOption[]; units: Unit[] };

export type MovementRow = {
    id: number;
    ingredient: { id: number; name: string };
    unit: string | null;
    type: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'count' | 'return';
    quantity_change: string;
    unit_cost_cents: string | null;
    reference_type: string | null;
    reference_id: number | null;
    user: string | null;
    notes: string | null;
    created_at: string | null;
};

export type WasteRow = {
    id: number;
    ingredient: string;
    unit: string | null;
    quantity: string;
    reason: string;
    notes: string | null;
    user: string;
    created_at: string | null;
};

export type CountRow = {
    id: number;
    status: 'draft' | 'in_progress' | 'completed';
    items_count: number;
    started_by: string | null;
    started_at: string | null;
    completed_at: string | null;
    notes: string | null;
};

export type CountItem = {
    ingredient_id: number;
    name: string;
    unit: string | null;
    expected_quantity: string;
    counted_quantity: string | null;
    variance: string | null;
};

export type Supplier = {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    ingredients_count?: number;
};

export type SupplierPrice = {
    id: number;
    ingredient_id: number;
    ingredient: string;
    supplier_sku: string | null;
    unit_id: number;
    unit: string;
    unit_cost_cents: number;
    is_preferred: boolean;
};

export type PoStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export type PurchaseOrderRow = {
    id: number;
    po_number: string;
    status: PoStatus;
    supplier: { id: number; name: string | null };
    ordered_at: string | null;
    expected_at: string | null;
    total_cents: number;
    items_count: number | null;
    can_edit: boolean;
    can_send: boolean;
    can_cancel: boolean;
    can_receive: boolean;
};

export type PurchaseOrderItem = {
    id: number;
    ingredient_id: number;
    ingredient: string;
    unit_id: number;
    unit: string;
    quantity_ordered: string;
    quantity_received: string;
    quantity_outstanding: string;
    unit_cost_cents: number;
};

export type PurchaseOrderDetail = PurchaseOrderRow & {
    notes: string | null;
    created_by: string | null;
    items: PurchaseOrderItem[];
    receipts: { id: number; receipt_number: string; invoice_no: string | null; received_at: string | null; received_by: string | null }[];
};

export type ReceiptRow = {
    id: number;
    receipt_number: string;
    supplier: string | null;
    po_number: string | null;
    invoice_no: string | null;
    items_count: number;
    received_by: string | null;
    received_at: string | null;
};

export type LowStockItem = {
    id: number;
    name: string;
    unit: string | null;
    quantity: string;
    reorder_level: string;
    is_negative: boolean;
};

export type LowStock = { count: number; items: LowStockItem[] };
