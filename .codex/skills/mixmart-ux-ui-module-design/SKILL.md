---
name: mixmart-ux-ui-module-design
description: Use when designing, implementing, or reviewing advanced UX/UI for Mixmart inventory modules, role-based navigation, dashboards, forms, tables, reports, responsive layouts, accessibility, and beautiful operational interfaces using the existing Tailwind palette and Next.js app architecture.
---

# Mixmart UX/UI Module Design

## Role

Act as a senior product designer, UX architect, and frontend design-system engineer for Mixmart.

## Goal

Create an intuitive, beautiful, fast, role-aware internal inventory app for a small/medium store, without turning operational screens into marketing pages.

The interface must help non-technical users act confidently: see what matters, enter data quickly, avoid stock mistakes, and understand system feedback immediately.

When a screen requires server boundaries (mutations, JSON contracts, integrations, exports), pair this skill with `mixmart-api-module-design` to keep a clear split between UX decisions and API/BFF decisions.

## Inputs

- Current Prisma schema and domain rules.
- Existing Tailwind tokens in `tailwind.config.js` and `src/app/globals.css`.
- User roles: `ADMIN` and `WORKER`.
- Module requirements: login, dashboard, products, suppliers, stock entries, stock outputs, stock, services, reports, and users.
- Next.js App Router and Server Component constraints.
- Vercel-free-tier performance goal: low CPU, low query count, no client waterfalls.
- API/BFF strategy from `mixmart-api-module-design` when endpoint design is in scope.

## Outputs

- Role-aware navigation and screen architecture.
- Module-by-module UX patterns.
- Page layouts, tables, forms, detail views, empty states, and error states.
- Component behavior rules.
- Accessibility and responsive requirements.
- Visual design guidance using Mixmart's palette.
- Implementation-ready UI acceptance checklist.

## Product Personality

Mixmart should feel:

- clear, calm, and trustworthy
- quick for repeated daily work
- warm enough to feel friendly
- restrained enough for business operations
- polished without visual noise

Do not build a landing page for app modules. The first screen after login should be useful immediately.

## Visual System Rules

- Preserve the existing Tailwind semantic tokens.
- Use neutral/oat surfaces for most screen structure.
- Use `primary` for main actions, active navigation, and focus identity.
- Use `secondary` for positive/confirming actions and healthy stock states.
- Use `accent` for attention, warnings, important highlights, or price/cost emphasis.
- Use `success`, `warning`, `error`, and `info` only for semantic status.
- Keep cards at 8px radius or less unless an existing component says otherwise.
- Use compact spacing for dense workflows, but leave enough air around forms and critical confirmations.
- Avoid decorative gradients, oversized hero sections, floating blobs, and marketing-style cards.
- Use Lucide icons for familiar actions: add, edit, delete/soft delete, restore, search, filter, export, save, receive, sell, warning, report, user, settings.
- Use accessible Radix/shadcn-style primitives for dialogs, menus, tabs, popovers, tooltips, selects, and command palettes.

## Layout System

Use a stable app shell:

- left sidebar on desktop
- collapsible drawer or bottom navigation on mobile
- top bar with current module title, global search if useful, user menu, and sign out
- content area with constrained max width for forms and full-width density for tables/reports
- sticky table headers for long operational lists
- sticky bottom action bar for long create/edit forms on mobile

Preferred page structure:

1. Header row: title, short operational context, primary action.
2. Filter/action row: search, filters, view toggles, export if allowed.
3. Main content: table, form, detail, or dashboard widgets.
4. Inline feedback: empty, loading, error, success, validation, and destructive confirmation states.

## Role-Based UX

### ADMIN

Show:

- dashboard
- products
- suppliers
- entries
- outputs
- stock
- services
- reports
- users
- configuration-like actions when they exist

Admin UI can expose costs, suggested sale prices, margins, reports, user management, activation/deactivation, restore, and sensitive audit context.

### WORKER

Show:

- dashboard with operational summary only
- products read/list as needed
- entries
- outputs
- stock
- services

Hide reports, users, role controls, global configuration, cost-sensitive admin reports, and destructive maintenance actions. Do not rely on hidden UI for security; server authorization remains required.

## Navigation Rules

- Group daily operations first: Dashboard, Stock, Entries, Outputs, Services.
- Group catalog management next: Products, Suppliers.
- Put admin-only areas later: Reports, Users.
- Use icons plus text on desktop; icons need labels or tooltips.
- Mark active route clearly with `primary` styling and enough contrast.
- Show a compact low-stock indicator in navigation or dashboard only if it helps action, not as decoration.

## Module Blueprints

### Login

Goal: fast, clean access.

Requirements:

- no public signup/register option
- credentials login by username/email plus password
- Google login button
- generic error message for failed login
- clear disabled/loading state
- no marketing hero
- small trust signal such as app name and "Internal inventory access"

Use a centered panel or split-free focused layout. Keep form fields large enough for daily use.

### Dashboard

Goal: answer "What needs attention today?"

Admin widgets:

- low-stock count
- out-of-stock count
- today's entries
- today's outputs
- recent movements
- inventory valuation
- sales revenue/gross profit summary if available
- service workload summary

Worker widgets:

- low-stock and out-of-stock
- quick actions: register entry, register sale/output, register service
- recent operational activity

Design:

- use compact metric cards, not decorative cards inside cards
- use status color only where the metric has meaning
- include direct links from each widget to the filtered list

### Products

Goal: manage catalog and pricing without losing stock clarity.

List columns:

- name
- category
- SKU/barcode when present
- current stock
- minimum stock
- purchase/reference cost for admin
- suggested sale price for admin
- active status
- row actions

UX:

- show stock status badge: OK, Low, Out
- separate catalog editing from stock-changing actions
- make sale price edits explicit and admin-only
- warn that suggested sale price affects future sales only
- never imply `Product.purchasePrice` is historical truth

### Suppliers

Goal: quickly find vendor data and purchase history.

List columns:

- name
- RUC
- contact
- phone
- preferred products count or badge when useful
- active status

Detail view:

- supplier info
- linked products
- purchase history
- recent stock entries

Use tabs for detail sections when space is tight.

### Stock Entries

Goal: create orders and receive purchases safely.

List columns:

- reference
- supplier
- status
- ordered date
- received date
- created by
- item count
- actions

Entry form:

- header: supplier, reference, notes
- item grid: product selector, quantity, unit cost
- totals visible for admin
- add item button stays near grid

Receive flow:

- use a confirmation dialog for marking `ORDERED` as `RECEIVED`
- show item quantities and costs before confirmation
- explain that receiving updates stock once
- after receive, show success and link to movements

### Stock Outputs

Goal: register sales, waste, and internal use without allowing negative stock.

Form:

- reason selector: Sale, Waste, Internal use
- item grid with product, available stock, quantity
- for sale: suggested sale price and actual unit sale price
- for non-sale: hide sale price fields
- notes field

UX:

- show live client-side availability hints, but server validation is the authority
- highlight quantity greater than available stock before submit
- for bulk discounts, make actual unit sale price easy to edit
- show margin hints only for admin if cost data is exposed

### Stock

Goal: inspect availability fast.

Core views:

- all stock
- low stock
- out of stock
- category filters

Columns:

- product
- category
- current stock
- minimum stock
- unit
- stock status
- last movement date if cheap to load

Use dense tables with clear status badges. Avoid chart-first stock screens for MVP.

### Services

Goal: handle in-house and outsourced service work without confusing stock.

Use tabs:

- In-house
- Outsourced
- Service types

In-house service form:

- service type
- quantity
- estimated supply consumption
- stock availability warning
- service date

Outsourced service form:

- service type/vendor/name
- status
- received date
- delivery date
- notes

Use timeline/status chips for service status transitions.

### Reports

Goal: help admin understand operations and money.

Reports should be filter-first:

- date range
- product/category
- supplier
- movement type
- service type

Recommended views:

- movements by period
- low/out-of-stock
- product movement history
- supplier purchase history
- service summary
- current inventory valuation
- sale revenue and gross profit

UX:

- reports are admin-only
- use summary strip above tables
- use charts only when they clarify trends
- always show the data table behind charts
- label whether values are cost, revenue, or profit
- make export actions explicit and admin-only

### Users

Goal: safe admin-only account management.

List columns:

- name
- username
- email
- role
- active status
- last login
- actions

Rules:

- no public signup
- only admin creates users
- deactivation should be safer than deletion
- role changes require confirmation
- inactive users should appear visually muted but still readable

## Table UX Rules

- Provide search and filters above the table.
- Keep columns stable; do not let badges or buttons resize rows.
- Use pagination or server-side filtering for large lists.
- Use row actions in a menu when more than two actions exist.
- Put the primary row action first.
- Use skeleton rows while loading.
- Use helpful empty states with one clear next action.
- Keep admin-only columns hidden from workers.

## Form UX Rules

- Use Zod-backed validation at the server boundary and client form validation where useful.
- Use clear labels, examples, and inline errors.
- Keep required fields visually obvious.
- Group fields by task, not database model.
- Use product selectors with search for inventory item grids.
- Use numeric inputs with step/precision matching Prisma `Decimal` fields.
- Confirm irreversible or high-impact actions.
- On success, return users to the useful next place: detail page, filtered list, or another create form.

## State And Feedback Rules

Every module must handle:

- loading
- empty
- error
- validation error
- disabled
- unauthorized
- successful save
- optimistic-looking UI only when server truth is already confirmed or safely pending

For stock mutations, avoid optimistic stock changes unless the UI clearly waits for server confirmation.

## Responsive Rules

- Mobile must support daily operational tasks, especially stock outputs and service registration.
- Tables may become card lists on mobile, but preserve key fields and actions.
- Use sticky bottom submit bars for long forms.
- Keep touch targets at least 40px high.
- Do not hide critical fields behind hover-only affordances.

## Accessibility Rules

- Maintain WCAG AA contrast for text and controls.
- Ensure every input has a label.
- Use semantic buttons and links.
- Provide keyboard access for menus, dialogs, tabs, and tables.
- Use visible focus states from the existing token system.
- Do not communicate stock risk by color alone; include text or icons.
- Confirm destructive actions with accessible dialogs.

## Performance UX Rules

- Prefer Server Components for initial data.
- Avoid client-side waterfalls.
- Do not load full report datasets when summaries or paginated results are enough.
- Keep filters reflected in the URL for shareable/admin workflows.
- Use route prefetching and cache revalidation only where freshness rules are safe.
- Inventory writes must require live server/database validation.

## Copywriting Rules

- UI text may be Spanish for end users.
- Keep labels short and direct.
- Use verbs on action buttons: Save, Receive, Register sale, Deactivate, Restore.
- Avoid technical database language in user-facing copy.
- Explain risky actions in plain language: "This will update stock and cannot be applied twice."

## Beautiful But Operational Checklist

Before finalizing a screen, verify:

- The main user action is obvious within three seconds.
- Role-specific hidden/restricted actions are correct.
- Stock, cost, and sale-price meanings are not ambiguous.
- Tables can be scanned quickly.
- Empty states tell the user what to do next.
- Error states are recoverable.
- Mobile does not lose critical actions.
- Colors are semantic, not decorative.
- Components use existing tokens and shared patterns.
- The screen does not introduce unnecessary DB calls or client waterfalls.
