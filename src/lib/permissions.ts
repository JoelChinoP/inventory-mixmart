import type { UserRole } from "../../prisma/generated/client";

export const ADMIN_ROLE: UserRole = "ADMIN";
export const WORKER_ROLE: UserRole = "WORKER";
export const OPERATIONAL_ROLES: UserRole[] = [ADMIN_ROLE, WORKER_ROLE];

export const protectedPaths = [
  "/dashboard",
  "/stock",
  "/entries",
  "/outputs",
  "/services",
  "/products",
  "/suppliers",
  "/reports",
  "/users",
] as const;

export const adminOnlyPaths = ["/reports", "/users"] as const;

export function canAccessPath(role: UserRole, pathname: string) {
  if (role === ADMIN_ROLE) {
    return true;
  }

  return !adminOnlyPaths.some((path) => pathname.startsWith(path));
}

export function canManageCatalog(role: UserRole) {
  return role === ADMIN_ROLE;
}

export function canManageUsers(role: UserRole) {
  return role === ADMIN_ROLE;
}

export function canViewReports(role: UserRole) {
  return role === ADMIN_ROLE;
}
