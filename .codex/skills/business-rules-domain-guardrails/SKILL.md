---
name: business-rules-domain-guardrails
description: Use when translating Mixmart inventory, supplier, stock, service, report, user-role, Prisma, PostgreSQL, trigger, constraint, migration, and integration-test requirements into enforceable domain rules.
---

# Mixmart Domain Guardrails

## Role
Act as a domain architect specialized in Prisma, PostgreSQL, and enforceable business invariants for Mixmart inventory.

## Scope
The system manages products, suppliers, stock entries, stock outputs, stock movements, services, reports, users, and roles for a small/medium store that sells school supplies, bazaar items, and snacks.

Keep the design practical. Do not add POS, invoicing, cashbox, customers, accounting, payments, multi-branch, or external integrations unless explicitly requested.

## Core Model
- `Product` is the catalog item and stores fast-read `currentStock`.
- `StockMovement` is the immutable inventory ledger and the audit source for reports.
- `StockEntry` and `StockEntryItem` record purchases/orders.
- `StockOutput` and `StockOutputItem` record sales, waste, and internal use.
- `ServiceType`, `ServiceTypeSupply`, `ServiceRecord`, and `ServiceConsumption` record in-house and outsourced services.
- `User.role` supports `ADMIN` and `WORKER`.

## Non-Negotiable Rules
1. Stock must never be negative.
2. A stock output or service consumption must not exceed available stock.
3. `ORDERED` stock entries must not affect stock.
4. `RECEIVED` stock entries must affect stock exactly once.
5. Every stock change must create an immutable `StockMovement`.
6. Historical operational rows must not be physically deleted in normal flows.
7. Products, suppliers, users, and catalog/configuration rows may use active flags or soft delete.
8. Admin-only reports and user management must be enforced server-side.
9. Business-critical stock changes must be enforced in the database or a transaction-safe server layer, never only in the UI.

## Snack Policy
Snacks are regular inventory in this project.

Do not require lot numbers, expiration dates, FEFO, expiring alerts, or `InventoryLot` behavior for snacks. The business decision is that snacks rotate quickly and expiration tracking adds unnecessary complexity.

If expiration/lots are requested later, treat that as a new requirement and reintroduce it deliberately with schema, triggers, UI, and tests.

## Cost And Reporting Policy
- `StockEntryItem.unitCost` stores the actual purchase cost for that received item.
- `Product.purchasePrice` is the current weighted-average/reference purchase cost used for simple operational valuation.
- When purchase cost changes between orders, preserve the historical entry cost and update `Product.purchasePrice` using weighted average.
- `StockOutputItem.unitCost` and `StockMovement.unitCost` must capture the cost at the time of output/consumption so reports do not depend on a later mutable product price.
- `Product.salePrice` is the current suggested sale price and may be changed by an admin for future sales.
- `StockOutputItem.suggestedUnitSalePrice` stores the suggested price snapshot at sale time.
- `StockOutputItem.unitSalePrice` stores the real unit sale price charged, allowing discounts or negotiated prices without rewriting the product suggestion.
- Revenue/profit reports must use the `StockOutputItem` sale-price snapshot fields and output cost snapshots, not mutable product prices.
- Suggested sale price history is future scope; do not add `ProductSalePriceHistory` unless explicitly requested.

## Enforcement Guidance
- Use Prisma enums and relations for readability.
- Use PostgreSQL `CHECK` constraints for positive quantities, non-negative money/stock, and coherent dates.
- Use triggers for derived stock, idempotent receive transitions, immutable ledgers, and cross-row stock validation.
- Use atomic updates such as `UPDATE products SET current_stock = current_stock - qty WHERE current_stock >= qty` for stock decrements.
- Keep `Product.currentStock` materialized for speed and reconcile it with `StockMovement` when auditing.
- Keep indexes aligned with common filters: product/date, movement type/date, direction/date, supplier/date, user/date, category/active or category/deleted.

## Services
- In-house services may consume supplies through `ServiceTypeSupply`.
- Creating a non-cancelled in-house `ServiceRecord` should create immutable `ServiceConsumption` rows and stock movements.
- Outsourced services track status and delivery dates but should not consume stock unless explicitly configured.

## Tests To Require
- Received entries increase stock once and ordered entries do not.
- Outputs and service consumptions reject insufficient stock.
- Historical rows and stock movements are immutable.
- Low-stock and movement reports remain queryable by date/product/category.
- Soft delete hides configured catalog rows without weakening append-only history protections.
- Purchase cost changes are preserved for entry history and frozen on outgoing cost records for reports.
- Sale outputs freeze suggested and actual sale prices, and profit reports use those snapshots.
- Non-sale outputs keep sale price fields null.
