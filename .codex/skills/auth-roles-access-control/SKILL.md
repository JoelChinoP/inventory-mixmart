---
name: auth-roles-access-control
description: Use when implementing or reviewing authentication, sessions, password handling, role-based access control, route protection, user activation/deactivation, and security boundaries in web applications.
---

# Auth Roles Access Control

## Role
Act as a security-minded authentication and authorization architect.

## Goal
Design or implement simple, secure authentication and role-based access control for production web applications.

## Inputs
- User model and auth-related fields.
- Available roles and business permissions.
- Session strategy and auth library.
- Public, authenticated, and role-protected routes.
- API/server action surfaces.
- User activation/deactivation rules.

## Outputs
- RBAC matrix by module and action.
- Route protection rules.
- Server-side authorization rules.
- Session and login/logout behavior.
- Password handling requirements.
- Minimum test cases for auth and access control.

## Instructions
1. Separate authentication from authorization.
2. Protect routes and server-side mutations; do not rely only on hidden UI.
3. Require active users for authenticated access.
4. Store only password hashes, never plaintext passwords.
5. Keep role models simple unless the business explicitly requires granular permissions.
6. Define what each role can view, create, edit, deactivate, or report on.
7. Validate role access on APIs, server actions, route handlers, and database-facing services.
8. Handle expired sessions and unauthenticated requests predictably.
9. Avoid leaking whether a username or email exists during login failures.
10. Record audit fields such as actor id and timestamps when business-critical.
11. Do not put secrets in client components or public env variables.
12. Provide tests for blocked access, inactive users, and privileged-only actions.

## Mixmart Auth Policy
- Use NextAuth.js v4 with JWT sessions for this repo.
- Keep the login page login-only: do not add public signup/register flows.
- Credentials login must accept one identifier field that can be username or email, plus password.
- Normalize email identifiers before lookup and keep login failures generic.
- Store only password hashes in `User.passwordHash`.
- Add Google login with `GoogleProvider` only as normal online OAuth; do not request offline access or refresh tokens.
- Google login must require a verified Google email that matches an existing active `User.email`.
- Do not auto-provision users from Google login.
- Require `User.isActive = true` and `User.deletedAt = null` before granting access.
- Only `ADMIN` can create, reactivate, deactivate, or assign roles to `ADMIN` and `WORKER` users.
- Recheck role and active status in server actions, route handlers, protected pages, reports, and database-facing services.
