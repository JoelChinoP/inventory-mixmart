# Implementation Plan - Mixmart Inventory System
Version: 1.1
Stack: Next.js App Router, NextAuth.js v4, Prisma ORM 7, Supabase Postgres, Tailwind CSS
Orientation: executable, server-first, cost-aware, Vercel-free-tier friendly

## 1. Objective
Build a solid MVP for Mixmart inventory while respecting the current schema and business decisions:

- no snack lots, expiration dates, FEFO, or expiration alerts
- purchase costs may vary across entries of the same product
- `Product.purchasePrice` is the current weighted-average/reference purchase cost
- historical cost truth is frozen on entry items, output items, and stock movements
- `Product.salePrice` is the current suggested sale price for future sales
- `StockOutputItem.suggestedUnitSalePrice` and `StockOutputItem.unitSalePrice` freeze sale-time values
- `ProductSalePriceHistory` is future scope
- endpoint/server-action work should target 1-3 database round trips

## 2. Base Architecture Decisions
### Stack
- Frontend and BFF: Next.js App Router
- Authentication: NextAuth.js v4 with JWT sessions
- Database: Supabase Postgres
- ORM and migrations: Prisma ORM 7
- Validation: Zod
- UI: Tailwind CSS plus Radix/shadcn-style accessible primitives
- Complex tables: TanStack Table
- Forms: React Hook Form
- Icons: Lucide React
- Testing: Node test runner/tsx for current DB integration tests; add Vitest/Playwright later if UI coverage grows

### Principles
- Keep all business mutations on the server.
- Never write inventory directly from browser code.
- Use Prisma only from server code.
- Prefer Server Actions as the default BFF surface for internal app workflows.
- Add Route Handlers only for explicit JSON/API consumers, not as placeholders.
- Do not create empty `app/api/**/route.ts` files.
- Validate auth and roles in every server action, route handler, and domain service.
- Keep database constraints/triggers or transaction-safe server services responsible for critical stock invariants.
- Separate report queries from transactional write flows.
- Prefer simple, explicit code over hidden magic.

### Supabase And Prisma
Use Supabase for:

- hosted PostgreSQL
- operational database management
- future storage if explicitly needed

Use Prisma for:

- relational schema
- migrations
- generated types
- transaction-safe access
- Client Extensions such as soft delete

Do not use Supabase Auth in this repo unless the auth strategy is deliberately changed later.

## 3. Recommended Project Structure
```txt
src/
  app/
    (public)/login
    (app)/dashboard
    (app)/products
    (app)/suppliers
    (app)/entries
    (app)/outputs
    (app)/stock
    (app)/services
    (app)/reports
    (app)/users
    api/
  components/
    auth/
    ui/
  features/
    products/
    suppliers/
    stock-entries/
    stock-outputs/
    stock/
    services/
    reports/
    users/
  lib/
    auth.ts
    password.ts
    prisma.ts
    permissions/
    validation/
    utils/
  server/
    actions/
    services/
    queries/
    reports/
    audit/
prisma/
  schema.prisma
  extensions/
  migrations/
  sql/
tests/
```

Use the current repo names where they already exist. Do not rename Spanish-facing routes or UI text merely for documentation consistency; code-facing model/service names should remain clear English.

## 4. Current Data Model Alignment
Use the current Prisma model names:

- `User`
- `Supplier`
- `Product`
- `ProductSupplier`
- `StockEntry`
- `StockEntryItem`
- `StockOutput`
- `StockOutputItem`
- `ServiceType`
- `ServiceTypeSupply`
- `ServiceRecord`
- `ServiceConsumption`
- `StockMovement`

Do not reintroduce:

- `InventoryLot`
- `lotNumber`
- `expirationDate`
- `averageCost`
- `lastPurchaseCost`
- `StockLedger`
- `InventoryEntry`
- `InventoryExit`

Those names appear in older planning docs but do not match the current schema.

## 5. Database Design Rules
### IDs And Types
- Use UUID primary keys with Prisma `@db.Uuid`.
- Use `Decimal` for quantities and money.
- Use PostgreSQL `date` only for true date-only fields such as `User.dateOfBirth`.
- Keep operational timestamps as `DateTime`.

### Soft Delete
- Use `deletedAt` only where hiding/configuration recovery is useful.
- Apply soft delete through Prisma Client Extensions in Prisma 7.
- Keep operational history append-only; do not delete `StockMovement` in normal flows.
- Keep raw Prisma access for audit/maintenance code only.

### Indexes
Keep indexes aligned with actual filters:

- product category/status/name
- product stock thresholds
- supplier name/status
- stock entry supplier/date and status/date
- stock output reason/date and creator/date
- stock movement product/date, movement type/date, direction/date, performer/date
- soft-delete filters on catalog/configuration tables

## 6. Product And Cost Strategy
### Product Fields
`Product` should keep:

- `purchasePrice`: current weighted-average/reference purchase cost
- `salePrice`: current suggested sale price for future sales
- `currentStock`: fast-read materialized stock
- `minimumStock`: low-stock threshold

`purchasePrice` is mutable operational state. It is useful for current valuation, but it is not historical truth.

### Purchase Cost History
Keep historical cost through:

- `StockEntryItem.unitCost`
- `StockMovement.unitCost`
- `StockOutputItem.unitCost`

When a purchase is received, calculate:

```txt
newPurchasePrice =
  ((previousStock * previousPurchasePrice) + (entryQuantity * entryUnitCost))
  / (previousStock + entryQuantity)
```

If previous stock is zero, use the incoming `unitCost`.

### Report Consequence
Reports can safely answer:

- purchase history by actual unit cost
- current inventory valuation
- output cost by period
- waste/internal-use cost by period
- service consumption cost by period
- gross profit for sales when `unitSalePrice` is present

Reports must not recalculate historical costs from current `Product.purchasePrice`.

## 7. Sale Pricing Strategy
### Suggested Price
`Product.salePrice` is admin-managed and applies from the time it is changed onward.

### Actual Sold Price
`StockOutputItem.unitSalePrice` is the real unit price charged on a sale line. It can differ from the suggested price for discounts, bulk deals, or negotiated prices.

### Snapshot Rules
For `StockOutput.reason = SALE`:

- copy `Product.salePrice` into `StockOutputItem.suggestedUnitSalePrice`
- require or explicitly decide how to handle `StockOutputItem.unitSalePrice`
- preserve `StockOutputItem.unitCost`

For `WASTE` and `INTERNAL_USE`:

- keep sale price fields null
- keep cost snapshots for valuation

### Future Scope
Do not implement `ProductSalePriceHistory` yet. The current MVP only needs the current suggested price plus sale-time snapshots.

## 8. Authentication Strategy
### NextAuth.js
Use NextAuth.js v4 with JWT sessions because the repo already uses `next-auth`.

Required providers:

- Credentials provider using `username or email + password`
- Google provider using normal online login only

Google OAuth rules:

- Do not request offline access.
- Do not request refresh tokens.
- Do not auto-create users.
- Allow login only when the Google email is verified and matches an existing active `User.email`.
- Reject inactive or soft-deleted users.

Credentials rules:

- Accept a single identifier field that can be username or email.
- Normalize email to lowercase before lookup.
- Compare only password hashes.
- Return a generic failure message.

User creation:

- No public signup page.
- No create-account link on login.
- Only an `ADMIN` can create `ADMIN` or `WORKER` users.

## 9. Authorization Strategy
- `ADMIN` can access all modules.
- `WORKER` can access operational stock workflows only.
- Reports and user management are admin-only.
- UI may hide actions, but server code must enforce permissions.
- Server actions and route handlers must call auth/role guards before DB mutation.
- Inactive/deleted users must be denied even if their JWT has not expired.

## 10. Stock Consistency Strategy
### Received Stock Entry
Transaction:

1. Load the entry and items.
2. Ensure status transition is valid and stock has not already been applied.
3. For each item, update the product stock and weighted-average `purchasePrice`.
4. Create one `StockMovement` per item.
5. Mark receipt state consistently.

The current schema uses a unique relation between `StockMovement.stockEntryItemId` and the entry item to help prevent duplicate application.

### Stock Output
Transaction:

1. Validate user role.
2. Validate all products and quantities.
3. Decrement stock atomically or under transaction-safe checks.
4. Create `StockOutput` and `StockOutputItem` rows.
5. Freeze cost in `StockOutputItem.unitCost`.
6. Freeze sale prices for `SALE` items.
7. Create `StockMovement` rows.

### Service Consumption
Transaction:

1. Create or update the `ServiceRecord`.
2. Read configured `ServiceTypeSupply` rows.
3. Compute required consumption.
4. Validate stock.
5. Create `ServiceConsumption` rows.
6. Create `StockMovement` rows with frozen cost.

## 11. Reports
Required reports:

- stock movement history by period
- product movement history
- low-stock and out-of-stock products
- supplier purchase history
- service summary by period
- current inventory valuation
- output cost by period
- sale revenue and gross profit by period/product

Use aggregate queries or SQL views for heavy reports. Avoid per-row Prisma loops that generate unbounded query counts.

Report formulas:

```txt
currentInventoryValue = Product.currentStock * Product.purchasePrice
saleRevenue = sum(StockOutputItem.quantity * StockOutputItem.unitSalePrice)
saleCost = sum(StockOutputItem.quantity * StockOutputItem.unitCost)
grossProfit = saleRevenue - saleCost
```

Filter revenue/profit to `StockOutput.reason = SALE`.

## 12. Endpoint And Server Action Budget
Target 1-3 DB round trips per endpoint/server action.

Guidelines:

- Use one shaped Prisma query with `select`/`include` for detail pages.
- Use `Promise.all` only for independent reads that truly need separate queries.
- Batch lookups by IDs instead of querying inside loops.
- Use aggregate SQL for reports.
- Use transactions for stock-changing writes.
- Avoid calling `requireActiveUser` repeatedly inside the same request; cache/request-scope user context when practical.
- Return only fields needed by the UI.
- Avoid client-side fetch waterfalls. Load initial screen data in Server Components.

## 13. Next.js App Router Rules
Based on the local Next.js docs for this repo version:

- Pages and layouts are Server Components by default.
- Use Client Components only for browser interactivity, state, event handlers, browser APIs, and rich client tables/forms.
- Server Components can query the database directly through server-only modules.
- Server Functions/Actions are reachable by POST and must always verify auth and authorization.
- Route Handlers belong under `app/**/route.ts` and are useful for exports, explicit JSON APIs, integrations, and reusable endpoints.
- `GET` Route Handlers are not cached by default unless opted in.
- Prefer tag-based cache invalidation for mostly-read data.
- Keep mutation routes dynamic and transaction-safe.

Hybrid decision rule for this project:

- Server Actions: default for internal UI forms and authenticated mutations.
- Route Handlers: use for integrations, exports, webhooks, or reusable JSON endpoints consumed outside the current page flow.
- If there is no real API consumer yet, keep the API folder minimal; this is valid and preferred for MVP efficiency.

## 14. Caching And PWA Posture
Use caching only where freshness rules are clear:

- catalog lists
- supplier lists
- service type lists
- read-heavy report summaries with explicit filters

Do not cache stock mutations or transaction-critical stock checks.

Use:

- route prefetching from Next navigation
- cache tags/revalidation for catalog/report reads
- manifest/installability as the first PWA step

Do not implement offline inventory writes. Inventory writes must require live server/database validation.

## 15. UI Implementation Rules
- Build the actual app screens, not marketing pages.
- Use the existing Tailwind semantic tokens.
- Keep dense operational layouts: tables, filters, compact forms, clear status badges.
- Use neutral surfaces and reserve strong colors for meaning.
- Use accessible components for dialogs, menus, tabs, selects, tooltips, and popovers.
- Use icons for common actions where they improve scanning.
- Include loading, empty, error, disabled, and success states.
- Keep Spanish UI text acceptable for end users, but keep agent-facing docs and skills in English.

## 16. Feature Phases
### Phase 0 - Technical Base
- Prisma client and migration workflow
- NextAuth credentials login by username/email
- Google login matched to existing active users
- protected app layout
- role guards
- seed user data

### Phase 1 - Inventory Core
- products
- suppliers
- product-supplier links
- stock entries
- received-entry stock application
- stock outputs
- stock movements
- current stock
- purchase cost snapshots
- sale price snapshots

### Phase 2 - Services
- service types
- service type supplies
- service records
- in-house service consumption
- outsourced service workflow

### Phase 3 - Reports
- movement reports
- low-stock reports
- supplier purchase history
- service summaries
- valuation
- revenue and gross profit

### Phase 4 - Hardening
- audit helpers
- soft delete review
- concurrency tests
- report query optimization
- exports
- lightweight PWA manifest

## 17. Domain Services
Recommended server modules:

- `products.service.ts`: create, update, deactivate, list, detail
- `suppliers.service.ts`: create, update, link products, purchase history
- `stock-entries.service.ts`: create, update, receive, detail, list
- `stock-outputs.service.ts`: create sale/waste/internal use, detail, list
- `stock.service.ts`: current stock, low stock, valuation, movement history
- `services.service.ts`: create records, consume supplies, transition statuses
- `reports.service.ts`: aggregate reports
- `users.service.ts`: admin-only create/update/deactivate/reactivate
- `audit.service.ts`: explicit audit logging when needed

Keep route handlers and server actions thin; they validate input, authorize, call a service, and revalidate cache/UI.

## 18. Validation
Use Zod at the input boundary for:

- product forms
- supplier forms
- stock entry forms
- stock output forms
- service forms
- user forms
- report filters

Reinforce invariants inside services and the database. Zod is not a substitute for stock constraints.

## 19. Library Recommendations
### Keep
- `next-auth`: credentials and Google OAuth.
- `@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg`: Prisma/Postgres access.
- `tailwindcss`, `@tailwindcss/postcss`: styling and existing palette.

### Add For MVP
- `zod`: runtime validation plus TypeScript inference.
- `react-hook-form`: efficient client forms.
- `@hookform/resolvers`: Zod integration for forms.
- `lucide-react`: consistent, tree-shakable icons.
- `@radix-ui/react-*` packages as needed or generated `shadcn/ui` components: accessible primitives without inventing UI behavior.
- `@tanstack/react-table`: sortable/filterable/paginated inventory and report tables.

### Add Only When Needed
- `@tanstack/react-query`: interactive client screens that need refetching, optimistic updates, or polling.
- `serwist` or `@serwist/next`: future offline shell/service worker work; not needed for MVP inventory writes.
- `date-fns`: richer date formatting and report ranges.
- `sonner`: consistent toast notifications.
- `server-only`: optional guard for server-only modules if linting/type settings require an explicit dependency.

## 20. Required Tests
### Domain And Integration
- `ORDERED` entry does not change stock.
- `RECEIVED` entry changes stock once.
- Duplicate receipt cannot double-count stock.
- Output cannot leave stock negative.
- Service consumption cannot leave stock negative.
- Weighted-average `Product.purchasePrice` updates correctly after variable-cost entries.
- Output cost snapshots use the cost valid at the time of output.
- Sale output stores suggested and actual unit sale prices.
- Non-sale outputs clear sale price fields.
- Profit reports use snapshots, not mutable product prices.

### Auth
- credentials login accepts username or email.
- Google login rejects unknown users.
- Google login rejects inactive/deleted users.
- public signup does not exist.
- worker cannot access reports or user management.
- admin can create users.

### Performance
- representative endpoints stay within 1-3 DB round trips.
- report queries do not issue per-row loops.
- initial pages avoid client fetch waterfalls.

## 21. Risks And Mitigations
### Risk: Using mutable product cost for old reports
Mitigation: report from `StockEntryItem.unitCost`, `StockOutputItem.unitCost`, and `StockMovement.unitCost`.

### Risk: Suggested price changes corrupt revenue reports
Mitigation: freeze `suggestedUnitSalePrice` and `unitSalePrice` on sale items.

### Risk: Google OAuth creates uncontrolled users
Mitigation: match verified Google email to an existing active `User.email`; reject all others.

### Risk: Free-tier CPU and DB limits
Mitigation: server-first data loading, shaped queries, batching, aggregate SQL, cache tags for read-heavy screens, and transaction-scoped stock writes.

### Risk: PWA offline writes corrupt stock
Mitigation: installable shell only for MVP; all inventory writes require live server validation.

## 22. Final Acceptance Criteria
The MVP is correct when it:

- supports products, suppliers, entries, outputs, stock, services, reports, and users
- protects access by role
- uses login-only NextAuth.js auth with credentials and Google
- keeps user creation admin-only
- uses Supabase as Postgres hosting
- has no snack lot/expiration/FEFO logic
- supports variable purchase costs without corrupting reports
- supports suggested and actual sale price snapshots
- does not include `ProductSalePriceHistory`
- never leaves stock negative
- preserves complete operational history
- stays within the endpoint efficiency rules
