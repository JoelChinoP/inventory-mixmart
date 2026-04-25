---
name: mixmart-api-module-design
description: Use when designing, implementing, or reviewing Mixmart server actions, route handlers, JSON APIs, BFF boundaries, auth/role guards, validation, caching, and endpoint performance on Next.js App Router.
---

# Mixmart API Module Design

## Role

Act as a senior backend and BFF architect for Mixmart on Next.js App Router.

## Goal

Design practical server surfaces for Mixmart modules that are secure, fast, and cost-aware.

The API layer must preserve inventory invariants, avoid duplicated business logic, and stay efficient on Vercel free-tier style constraints.

## Inputs

- Current Prisma schema, migrations, and database triggers/constraints.
- Existing auth rules (NextAuth, active user checks, role checks).
- Existing server code in `src/server/actions.ts` and server services.
- Existing route handlers under `src/app/api/**/route.ts`.
- Module requirements: products, suppliers, entries, outputs, stock, services, reports, users.
- Consumer context: internal web UI only, or external/mobile/integration consumers.

## Outputs

- Clear decision per flow: Server Action vs Route Handler.
- API contracts (input schema, response schema, status codes, auth requirements).
- Thin handlers/actions that call shared server services.
- Caching and invalidation rules by endpoint type.
- Performance guardrails and query-budget checks.
- API acceptance checklist and test checklist.

## Core Policy (Non-Negotiable)

1. Prefer Server Actions for internal authenticated UI mutations and form workflows.
2. Add Route Handlers only when there is a real API consumer.
3. Do not scaffold empty `app/api/**/route.ts` files.
4. Keep business logic in shared server services, not inside handlers/actions.
5. Apply auth and role checks server-side for every mutation and protected read.
6. Keep each endpoint/server action near 1-3 DB round trips when feasible.

## Consumer Decision Matrix

Use Server Actions when:

- the caller is a form or action in the same Next.js app
- redirect/revalidate UX is desired
- no external JSON contract is needed

Use Route Handlers when:

- a mobile app, integration, webhook, or third party needs JSON
- exports/download endpoints are required
- a reusable API contract is needed across multiple clients

Use both only when:

- internal UI benefits from Server Actions
- external consumers need JSON endpoints
- both call the same shared service function(s)

## Module-Level Surface Guidance

### Products and Suppliers

- Internal CRUD in Server Actions by default.
- Add JSON endpoints only for external catalog sync, import/export, or integration.

### Stock Entries and Outputs

- Keep mutations transaction-safe in server services.
- If API is required, expose explicit mutation endpoints with strict validation and role checks.
- Never allow stock-changing logic in Client Components.

### Stock and Reports

- Internal page loads should prefer Server Components querying server-only modules.
- Create report Route Handlers only for export/integration needs.
- Use aggregate queries for report endpoints.

### Services

- Keep service-record creation and consumption checks in server services.
- Route Handlers are optional and consumer-driven.

### Users and Roles

- Admin-only management paths.
- Any JSON endpoint here must enforce admin role and active-user checks.

## API Contract Rules

- Validate all input with Zod at the boundary.
- Normalize identifiers and optional fields consistently.
- Return stable, explicit response shapes.
- Do not leak stack traces or sensitive internals in production responses.
- Keep decimals and money formats consistent with current domain conventions.

Suggested response envelope for JSON routes:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Not allowed"
  }
}
```

## Auth and RBAC Rules

- Require authenticated active user for protected endpoints/actions.
- Recheck role in handlers/actions and in called services when action is sensitive.
- Return:
  - `401` for unauthenticated
  - `403` for authenticated but unauthorized
  - `422` for validation/domain rule errors
- Keep login failures generic; do not reveal whether a user exists.

## Service Layer Rules

- Handlers/actions orchestrate only: parse -> authorize -> call service -> map response/revalidate.
- Services own business use-cases and DB transactions.
- Reuse the same service for Server Action and Route Handler variants.
- Avoid duplicated business logic between modules.

## Caching and Revalidation Rules

- Do not cache stock-changing mutations.
- For read-heavy APIs, define explicit freshness and cache tags.
- Revalidate affected paths/tags after successful mutations.
- Avoid stale reads for inventory-critical operations.

## Performance Rules

- Shape Prisma queries with `select`/`include`.
- Avoid N+1 query patterns and per-row loops.
- Batch lookups by ids.
- Use aggregate/group queries for reports.
- Keep payloads compact; return only fields needed by the consumer.
- Avoid UI fetch waterfalls by consolidating reads when possible.

## Error Handling Rules

- Map known domain errors to stable codes/messages.
- Keep insufficient-stock errors explicit but safe.
- Use idempotent protection for receive/output flows when applicable.
- For internal actions, redirect to user-friendly states/messages.

## API Creation Checklist

Before creating a new route handler, verify all:

1. Real consumer exists today (not speculative).
2. Server Action is not enough for current need.
3. Request and response schema are defined.
4. Auth and RBAC are defined and tested.
5. Query budget and payload size were reviewed.
6. Ownership service exists or is created once for reuse.

If any item fails, do not create the endpoint yet.

## Testing Checklist

- Auth tests: unauthenticated and unauthorized requests are blocked.
- Validation tests: malformed payloads fail predictably.
- Domain tests: stock and cost invariants are preserved.
- Contract tests: response shape and status codes are stable.
- Performance tests: representative requests stay within query budget.
- Regression tests: Server Action and Route Handler variants produce consistent business outcomes.

## Anti-Patterns (Avoid)

- Creating API folders and routes "for future use".
- Putting domain calculations only in UI components.
- Copy-pasting business logic between action and API files.
- Returning oversized nested payloads by default.
- Over-fragmenting APIs into many small endpoints that force waterfalls.
- Skipping role checks because UI already hides controls.

## Done Criteria

A module API/BFF implementation is complete when:

- Internal workflows run via Server Actions or justified Route Handlers.
- No empty/unused API endpoints exist.
- Business rules live in shared server services/database constraints.
- Auth and RBAC are enforced at server boundaries.
- Contract, domain, and auth tests exist for exposed endpoints.
- Query budget and response-time expectations are respected.
