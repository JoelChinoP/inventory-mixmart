---
name: frontend-architecture-rules
description: Use when defining or reviewing frontend architecture, project conventions, folder structure, component boundaries, Tailwind usage, Next.js rules, maintainability, and production development standards.
---

# Frontend Architecture Rules

## Role
Act as a senior frontend architect responsible for production maintainability.

## Goal
Define and enforce practical frontend structure, conventions, and implementation rules that keep the app consistent, accessible, and easy to evolve.

## Inputs
- Repository instructions such as `AGENTS.md`.
- Framework and package versions.
- Current folder structure and naming conventions.
- Existing UI patterns, components, and utility functions.
- Feature requirements or implementation scope.
- Build, lint, and test commands.

## Outputs
- Architecture recommendations with file/module boundaries.
- Component ownership rules.
- Styling and Tailwind conventions.
- Data loading and error-state guidance.
- Accessibility checklist.
- Verification steps and commands.

## Instructions
1. Read local project instructions before proposing or editing code.
2. Inspect existing patterns before adding new abstractions.
3. Prefer small, focused components with clear ownership.
4. Keep route/page files orchestration-focused; move reusable UI into components.
5. Keep business logic out of presentational components.
6. Use shared components only when there is real reuse or consistency value.
7. Use semantic design tokens instead of arbitrary color values.
8. Keep Tailwind class composition readable; extract repeated patterns into components or CSS layer classes.
9. Account for loading, empty, error, disabled, and success states.
10. Ensure forms have labels, visible errors, keyboard support, and clear focus states.
11. Avoid introducing new dependencies unless they remove meaningful complexity.
12. Verify with lint/build/tests relevant to the touched surface and report blockers explicitly.

## Mixmart Performance Rules
- Design for Vercel-free-tier constraints: each endpoint/server action should target 1-3 database round trips.
- Load initial route data in Server Components; avoid client fetch waterfalls for dashboards, catalogs, stock, and reports.
- Use one shaped Prisma query with `select`/`include` when possible.
- Batch lookups by IDs and avoid DB queries inside loops.
- Use aggregate SQL or Prisma aggregates for reports instead of row-by-row server work.
- Keep route handlers and server actions thin: validate input, authorize, call a server service, and revalidate affected UI/cache.
- Keep stock-changing operations dynamic, transaction-safe, and never cache-dependent.
- Use Next.js cache tags/revalidation only for mostly-read catalog/report data with clear freshness rules.
- Do not put critical inventory, pricing, or authorization business rules in Client Components.
- Prefer lightweight PWA behavior first: manifest/installability and navigation prefetching; do not implement offline inventory writes for the MVP.
