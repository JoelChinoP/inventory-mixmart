import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessPath,
  canManageCatalog,
  canManageUsers,
  canViewReports,
} from "../src/lib/permissions";

test("ADMIN can access all protected modules", () => {
  for (const path of [
    "/dashboard",
    "/stock",
    "/entries",
    "/outputs",
    "/services",
    "/products",
    "/suppliers",
    "/reports",
    "/users",
    "/profile",
  ]) {
    assert.equal(canAccessPath("ADMIN", path), true);
  }

  assert.equal(canManageCatalog("ADMIN"), true);
  assert.equal(canManageUsers("ADMIN"), true);
  assert.equal(canViewReports("ADMIN"), true);
});

test("WORKER is blocked from admin-only modules", () => {
  assert.equal(canAccessPath("WORKER", "/dashboard"), true);
  assert.equal(canAccessPath("WORKER", "/stock"), true);
  assert.equal(canAccessPath("WORKER", "/entries"), true);
  assert.equal(canAccessPath("WORKER", "/outputs"), true);
  assert.equal(canAccessPath("WORKER", "/services"), true);
  assert.equal(canAccessPath("WORKER", "/products"), true);
  assert.equal(canAccessPath("WORKER", "/suppliers"), true);
  assert.equal(canAccessPath("WORKER", "/reports"), false);
  assert.equal(canAccessPath("WORKER", "/users"), false);
  assert.equal(canAccessPath("WORKER", "/profile"), true);
  assert.equal(canManageCatalog("WORKER"), false);
  assert.equal(canManageUsers("WORKER"), false);
  assert.equal(canViewReports("WORKER"), false);
});
