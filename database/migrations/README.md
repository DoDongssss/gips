# Database migrations

One migration per table, all in this one flat folder. Table names, columns, indexes and foreign keys are exactly the same as before; only the file layout changed. No extra setup is needed: Laravel reads this folder as usual.

## How the files are grouped

Laravel runs migrations in file-name order, so a flat folder cannot have feature sub-folders. Instead each **feature gets its own date**, and the files of that feature sit together in the listing:

| Date prefix | Feature | Tables | What it holds |
|---|---|---|---|
| `2026_10_01_*` | framework | 5 | Laravel's own tables: cache, queue jobs, failed jobs. They run first because other migrations use the cache |
| `2026_10_02_*` | access | 10 | Sign-in and permissions: users, sessions, API tokens, passkeys, roles and permissions |
| `2026_10_03_*` | system | 5 | App plumbing: settings, activity log, notifications, idempotency keys, document counters |
| `2026_10_04_*` | menu | 9 | Menu catalogue (categories, products, sizes, pictures, modifiers) and the kitchen stations products are sent to |
| `2026_10_05_*` | pricing | 3 | Taxes, discounts and manager approvals |
| `2026_10_06_*` | devices | 1 | Paired registers, kiosks and kitchen screens |
| `2026_10_07_*` | shifts | 2 | Cash shifts and cash movements |
| `2026_10_08_*` | orders | 7 | Orders and everything that belongs to one order |
| `2026_10_09_*` | kitchen | 2 | Kitchen display (KDS) tickets |
| `2026_10_10_*` | payments | 5 | Payment methods, payments, receipts and refunds |
| `2026_10_11_*` | reports | 3 | X reports, Z reports and reopened days |
| `2026_10_12_*` | inventory | 12 | Ingredients, recipes, stock levels and counts, waste |
| `2026_10_13_*` | purchasing | 6 | Suppliers, purchase orders and goods receipts |
| `2026_10_14_*` | kiosk | 5 | Self-order kiosk: settings, sessions, heartbeats, welcome screens, upsell rules |

Every table only points at tables that are created before it, so the order is safe. Each file also starts with a `// Feature: ...` comment.

## Run them

These files replace the old ones, so the `migrations` table of an existing database no longer matches. Delete the old migration files first, then use a fresh database:

```bash
php artisan migrate:fresh --seed
```

## Adding a new migration

Use the normal command. New files get today's date, so they always run after these:

```bash
php artisan make:migration add_notes_to_orders_table
```

Once this has been deployed, never edit these files again. Change a table with a new `add_...` / `change_...` migration instead.

## Every table and its file

| # | Feature | Table | File |
|---|---|---|---|
| 1 | framework | `cache` | `2026_10_01_000010_create_cache_table.php` |
| 2 | framework | `cache_locks` | `2026_10_01_000020_create_cache_locks_table.php` |
| 3 | framework | `jobs` | `2026_10_01_000030_create_jobs_table.php` |
| 4 | framework | `job_batches` | `2026_10_01_000040_create_job_batches_table.php` |
| 5 | framework | `failed_jobs` | `2026_10_01_000050_create_failed_jobs_table.php` |
| 6 | access | `users` | `2026_10_02_000010_create_users_table.php` |
| 7 | access | `password_reset_tokens` | `2026_10_02_000020_create_password_reset_tokens_table.php` |
| 8 | access | `sessions` | `2026_10_02_000030_create_sessions_table.php` |
| 9 | access | `permissions` | `2026_10_02_000040_create_permissions_table.php` |
| 10 | access | `roles` | `2026_10_02_000050_create_roles_table.php` |
| 11 | access | `model_has_permissions` | `2026_10_02_000100_create_model_has_permissions_table.php` |
| 12 | access | `model_has_roles` | `2026_10_02_000110_create_model_has_roles_table.php` |
| 13 | access | `role_has_permissions` | `2026_10_02_000120_create_role_has_permissions_table.php` |
| 14 | access | `personal_access_tokens` | `2026_10_02_000130_create_personal_access_tokens_table.php` |
| 15 | access | `passkeys` | `2026_10_02_000140_create_passkeys_table.php` |
| 16 | system | `configurations` | `2026_10_03_000010_create_configurations_table.php` |
| 17 | system | `activity_log` | `2026_10_03_000020_create_activity_log_table.php` |
| 18 | system | `notifications` | `2026_10_03_000030_create_notifications_table.php` |
| 19 | system | `idempotency_keys` | `2026_10_03_000040_create_idempotency_keys_table.php` |
| 20 | system | `document_sequences` | `2026_10_03_000050_create_document_sequences_table.php` |
| 21 | menu | `stations` | `2026_10_04_000010_create_stations_table.php` |
| 22 | menu | `categories` | `2026_10_04_000020_create_categories_table.php` |
| 23 | menu | `products` | `2026_10_04_000030_create_products_table.php` |
| 24 | menu | `product_variants` | `2026_10_04_000040_create_product_variants_table.php` |
| 25 | menu | `product_images` | `2026_10_04_000050_create_product_images_table.php` |
| 26 | menu | `modifier_groups` | `2026_10_04_000100_create_modifier_groups_table.php` |
| 27 | menu | `modifiers` | `2026_10_04_000110_create_modifiers_table.php` |
| 28 | menu | `product_modifier_groups` | `2026_10_04_000120_create_product_modifier_groups_table.php` |
| 29 | menu | `category_stations` | `2026_10_04_000130_create_category_stations_table.php` |
| 30 | pricing | `taxes` | `2026_10_05_000010_create_taxes_table.php` |
| 31 | pricing | `discounts` | `2026_10_05_000020_create_discounts_table.php` |
| 32 | pricing | `discount_approvals` | `2026_10_05_000030_create_discount_approvals_table.php` |
| 33 | devices | `devices` | `2026_10_06_000010_create_devices_table.php` |
| 34 | shifts | `shifts` | `2026_10_07_000010_create_shifts_table.php` |
| 35 | shifts | `cash_movements` | `2026_10_07_000020_create_cash_movements_table.php` |
| 36 | orders | `orders` | `2026_10_08_000010_create_orders_table.php` |
| 37 | orders | `order_items` | `2026_10_08_000020_create_order_items_table.php` |
| 38 | orders | `order_item_modifiers` | `2026_10_08_000030_create_order_item_modifiers_table.php` |
| 39 | orders | `order_status_history` | `2026_10_08_000040_create_order_status_history_table.php` |
| 40 | orders | `order_discounts` | `2026_10_08_000050_create_order_discounts_table.php` |
| 41 | orders | `order_taxes` | `2026_10_08_000100_create_order_taxes_table.php` |
| 42 | orders | `order_number_sequences` | `2026_10_08_000110_create_order_number_sequences_table.php` |
| 43 | kitchen | `kds_tickets` | `2026_10_09_000010_create_kds_tickets_table.php` |
| 44 | kitchen | `kds_ticket_items` | `2026_10_09_000020_create_kds_ticket_items_table.php` |
| 45 | payments | `payment_methods` | `2026_10_10_000010_create_payment_methods_table.php` |
| 46 | payments | `payments` | `2026_10_10_000020_create_payments_table.php` |
| 47 | payments | `payment_transactions` | `2026_10_10_000030_create_payment_transactions_table.php` |
| 48 | payments | `receipts` | `2026_10_10_000040_create_receipts_table.php` |
| 49 | payments | `refunds` | `2026_10_10_000050_create_refunds_table.php` |
| 50 | reports | `x_reports` | `2026_10_11_000010_create_x_reports_table.php` |
| 51 | reports | `z_reports` | `2026_10_11_000020_create_z_reports_table.php` |
| 52 | reports | `reopened_days` | `2026_10_11_000030_create_reopened_days_table.php` |
| 53 | inventory | `units` | `2026_10_12_000010_create_units_table.php` |
| 54 | inventory | `unit_conversions` | `2026_10_12_000020_create_unit_conversions_table.php` |
| 55 | inventory | `ingredient_categories` | `2026_10_12_000030_create_ingredient_categories_table.php` |
| 56 | inventory | `ingredients` | `2026_10_12_000040_create_ingredients_table.php` |
| 57 | inventory | `recipes` | `2026_10_12_000050_create_recipes_table.php` |
| 58 | inventory | `recipe_items` | `2026_10_12_000100_create_recipe_items_table.php` |
| 59 | inventory | `modifier_recipe_items` | `2026_10_12_000110_create_modifier_recipe_items_table.php` |
| 60 | inventory | `stock_levels` | `2026_10_12_000120_create_stock_levels_table.php` |
| 61 | inventory | `stock_movements` | `2026_10_12_000130_create_stock_movements_table.php` |
| 62 | inventory | `stock_counts` | `2026_10_12_000140_create_stock_counts_table.php` |
| 63 | inventory | `stock_count_items` | `2026_10_12_000150_create_stock_count_items_table.php` |
| 64 | inventory | `waste_logs` | `2026_10_12_000200_create_waste_logs_table.php` |
| 65 | purchasing | `suppliers` | `2026_10_13_000010_create_suppliers_table.php` |
| 66 | purchasing | `supplier_ingredients` | `2026_10_13_000020_create_supplier_ingredients_table.php` |
| 67 | purchasing | `purchase_orders` | `2026_10_13_000030_create_purchase_orders_table.php` |
| 68 | purchasing | `purchase_order_items` | `2026_10_13_000040_create_purchase_order_items_table.php` |
| 69 | purchasing | `goods_receipts` | `2026_10_13_000050_create_goods_receipts_table.php` |
| 70 | purchasing | `goods_receipt_items` | `2026_10_13_000100_create_goods_receipt_items_table.php` |
| 71 | kiosk | `kiosk_settings` | `2026_10_14_000010_create_kiosk_settings_table.php` |
| 72 | kiosk | `kiosk_sessions` | `2026_10_14_000020_create_kiosk_sessions_table.php` |
| 73 | kiosk | `kiosk_heartbeats` | `2026_10_14_000030_create_kiosk_heartbeats_table.php` |
| 74 | kiosk | `kiosk_screens` | `2026_10_14_000040_create_kiosk_screens_table.php` |
| 75 | kiosk | `upsell_rules` | `2026_10_14_000050_create_upsell_rules_table.php` |

## What was folded into each table's own file

Some later migrations used to patch tables that earlier migrations had created. They are now part of the table's own file:

- `users`: the three `two_factor_*` columns (same position, after `password`).
- `products`, `order_items`: the `station_id` foreign key to `stations`.
- `orders`, `payments`, `shifts`: the `device_id` foreign key to `devices`; `orders` and `payments` also the `shift_id` foreign key to `shifts`.
- The performance indexes (`p8_*`) that were applied to `orders`, `payments`, `refunds`, `order_items`, `products`, `devices` and `upsell_rules`.

Not carried over, because they never changed the database:

- Five entries of the old index migration were skipped at run time (the index already existed, or the table `audit_logs` does not exist).
- The `Schema::hasTable('idempotency_keys')` guard, which only protected against a duplicate create.
