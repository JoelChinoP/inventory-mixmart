import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import type { Prisma, PrismaClient } from "../prisma/generated/client";
import { inventorySoftDeleteExtension } from "../prisma/extensions/soft-delete.extension";
import {
  decimalToNumber,
  expectDbError,
  resetTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
  type TestDatabase,
} from "./helpers/database";

let db: TestDatabase;
let prisma: PrismaClient;

before(async () => {
  db = await setupTestDatabase();
  prisma = db.prisma;
});

after(async () => {
  await teardownTestDatabase(db);
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

async function createUser() {
  return prisma.user.create({
    data: {
      username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firstName: "System",
      lastName: "User",
      passwordHash: "hashed_password",
      role: "ADMIN",
    },
  });
}

async function createSupplier(overrides: Partial<Prisma.SupplierCreateInput> = {}) {
  return prisma.supplier.create({
    data: {
      name: `Supplier ${Math.random().toString(36).slice(2, 8)}`,
      ruc: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      phone: "999999999",
      contactName: "Main Contact",
      ...overrides,
    },
  });
}

async function createProduct(overrides: Partial<Prisma.ProductCreateInput> = {}) {
  return prisma.product.create({
    data: {
      name: `Product ${Math.random().toString(36).slice(2, 8)}`,
      category: "SCHOOL_SUPPLIES",
      unitName: "unit",
      purchasePrice: 2.5,
      minimumStock: 3,
      ...overrides,
    },
  });
}

test("RF-01/RF-06: required fields, non-negative values, and unique supplier tax IDs are enforced", async () => {
  await createSupplier({
    name: "Supplier Alpha",
    ruc: "20111111111",
  });

  await expectDbError(
    db.schemaClient.query(`
      INSERT INTO products (id, name, category, unit_name, purchase_price, created_at, updated_at, current_stock, is_active)
      VALUES ('${randomUUID()}', 'Broken Product', 'SCHOOL_SUPPLIES', 'unit', 5, now(), now(), 0, true)
    `),
    'null value in column "minimum_stock"',
  );

  await expectDbError(
    db.schemaClient.query(`
      INSERT INTO products (id, name, category, unit_name, purchase_price, minimum_stock, current_stock, is_active, created_at, updated_at)
      VALUES ('${randomUUID()}', 'Negative Price Product', 'SCHOOL_SUPPLIES', 'unit', -1, 1, 0, true, now(), now())
    `),
    "chk_products_purchase_price_non_negative",
  );

  await expectDbError(
    db.schemaClient.query(`
      INSERT INTO products (id, name, category, unit_name, purchase_price, sale_price, minimum_stock, current_stock, is_active, created_at, updated_at)
      VALUES ('${randomUUID()}', 'Negative Sale Price Product', 'SCHOOL_SUPPLIES', 'unit', 1, -1, 1, 0, true, now(), now())
    `),
    "chk_products_sale_price_non_negative",
  );

  await expectDbError(
    createSupplier({
      name: "Supplier Beta",
      ruc: "20111111111",
    }),
    "ruc",
  );
});

test("Profile avatar is stored in the database and capped at 4 MB", async () => {
  const user = await createUser();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      avatarData: new Uint8Array([1, 2, 3]),
      avatarMimeType: "image/png",
      avatarUpdatedAt: new Date("2026-04-30T10:00:00.000Z"),
      avatarUrl: `/api/users/${user.id}/avatar?v=1`,
    },
  });

  assert.equal(updated.avatarMimeType, "image/png");
  assert.equal(updated.avatarData?.length, 3);

  await expectDbError(
    prisma.user.update({
      where: { id: user.id },
      data: {
        avatarData: new Uint8Array(4 * 1024 * 1024 + 1),
        avatarMimeType: "image/png",
        avatarUpdatedAt: new Date("2026-04-30T10:05:00.000Z"),
      },
    }),
    "chk_users_avatar_size",
  );

  await expectDbError(
    db.schemaClient.query(`
      UPDATE users
      SET avatar_data = '\\x01'::bytea,
          avatar_mime_type = 'image/gif',
          avatar_updated_at = now()
      WHERE id = '${user.id}'
    `),
    "chk_users_avatar_payload",
  );
});

test("RF-03/RF-09/RF-10/RF-11: snacks use simple inventory and only RECEIVED entries increase stock", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const snack = await createProduct({
    name: "Chocolate Bar",
    category: "SNACKS",
    minimumStock: 5,
  });

  await expectDbError(
    prisma.stockEntry.create({
      data: {
        supplierId: supplier.id,
        createdById: user.id,
        status: "ORDERED",
        orderedAt: new Date("2026-04-22T10:00:00.000Z"),
        receivedAt: new Date("2026-04-22T11:00:00.000Z"),
      },
    }),
    "chk_stock_entries_status_received_at",
  );

  await expectDbError(
    prisma.stockEntry.create({
      data: {
        supplierId: supplier.id,
        createdById: user.id,
        status: "RECEIVED",
        orderedAt: new Date("2026-04-22T10:00:00.000Z"),
        receivedAt: new Date("2026-04-22T09:59:00.000Z"),
      },
    }),
    "chk_stock_entries_status_received_at",
  );

  const orderedEntry = await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "ORDERED",
      orderedAt: new Date("2026-04-22T10:00:00.000Z"),
    },
  });

  await prisma.stockEntryItem.create({
    data: {
      stockEntryId: orderedEntry.id,
      productId: snack.id,
      quantity: 12,
      unitCost: 1.4,
    },
  });

  const beforeReceive = await prisma.product.findUniqueOrThrow({
    where: { id: snack.id },
  });
  assert.equal(decimalToNumber(beforeReceive.currentStock), 0);

  await prisma.stockEntry.update({
    where: { id: orderedEntry.id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date("2026-04-22T11:00:00.000Z"),
    },
  });

  const afterReceive = await prisma.product.findUniqueOrThrow({
    where: { id: snack.id },
  });
  assert.equal(decimalToNumber(afterReceive.currentStock), 12);

  const movements = await prisma.stockMovement.findMany({
    where: { productId: snack.id },
  });
  assert.equal(movements.length, 1);
  assert.equal(movements[0]?.movementType, "PURCHASE_ENTRY");
  assert.equal(movements[0]?.direction, "IN");
  assert.equal(decimalToNumber(movements[0]!.unitCost), 1.4);
});

test("RF-12/RF-16: received entries, output items, and historical rows become immutable", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const product = await createProduct({
    name: "Notebook",
    minimumStock: 2,
  });

  const entry = await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-22T08:00:00.000Z"),
      receivedAt: new Date("2026-04-22T08:15:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitCost: 2.3,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  await expectDbError(
    prisma.stockEntry.update({
      where: { id: entry.id },
      data: { status: "ORDERED" },
    }),
    "cannot be reverted",
  );

  await expectDbError(
    prisma.stockEntryItem.update({
      where: { id: entry.items[0]!.id },
      data: { quantity: 5 },
    }),
    "Received stock entry items are immutable",
  );

  const output = await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-22T09:00:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  await expectDbError(
    prisma.stockOutputItem.update({
      where: { id: output.items[0]!.id },
      data: { quantity: 3 },
    }),
    "stock_output_items are immutable",
  );

  await expectDbError(
    prisma.stockEntry.delete({
      where: { id: entry.id },
    }),
    "append-only",
  );
});

test("Improvement: a product can have multiple suppliers but only one preferred supplier", async () => {
  const product = await createProduct({
    name: "Planner",
  });
  const supplierA = await createSupplier({ ruc: "20900000001" });
  const supplierB = await createSupplier({ ruc: "20900000002" });

  await prisma.productSupplier.create({
    data: {
      productId: product.id,
      supplierId: supplierA.id,
      isPreferred: true,
    },
  });

  await prisma.productSupplier.create({
    data: {
      productId: product.id,
      supplierId: supplierB.id,
      isPreferred: false,
    },
  });

  await expectDbError(
    prisma.productSupplier.update({
      where: {
        productId_supplierId: {
          productId: product.id,
          supplierId: supplierB.id,
        },
      },
      data: {
        isPreferred: true,
      },
    }),
    "product_id",
  );
});

test("RF-13/RF-14/RF-15: outputs deduct snack stock without lot tracking and prevent overselling", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const snack = await createProduct({
    name: "Candy",
    category: "SNACKS",
    minimumStock: 4,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-22T07:00:00.000Z"),
      receivedAt: new Date("2026-04-22T07:10:00.000Z"),
      items: {
        create: [
          {
            productId: snack.id,
            quantity: 5,
            unitCost: 0.8,
          },
          {
            productId: snack.id,
            quantity: 8,
            unitCost: 0.8,
          },
        ],
      },
    },
  });

  await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-22T12:00:00.000Z"),
      items: {
        create: [
          {
            productId: snack.id,
            quantity: 6,
          },
        ],
      },
    },
  });

  const productAfterSale = await prisma.product.findUniqueOrThrow({
    where: { id: snack.id },
  });
  assert.equal(decimalToNumber(productAfterSale.currentStock), 7);

  await expectDbError(
    prisma.stockOutput.create({
      data: {
        createdById: user.id,
        reason: "SALE",
        occurredAt: new Date("2026-04-22T13:00:00.000Z"),
        items: {
          create: [
            {
              productId: snack.id,
              quantity: 8,
            },
          ],
        },
      },
    }),
    "Insufficient stock",
  );

  const outputMovements = await prisma.stockMovement.findMany({
    where: {
      productId: snack.id,
      direction: "OUT",
      movementType: "SALE",
    },
    orderBy: { occurredAt: "asc" },
  });

  assert.equal(outputMovements.length, 1);
  assert.equal(decimalToNumber(outputMovements[0]!.quantity), 6);
  assert.equal(decimalToNumber(outputMovements[0]!.unitCost), 0.8);
});

test("Cost reporting: purchase cost changes update average cost and freeze output movement cost", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const product = await createProduct({
    name: "Costed Product",
    purchasePrice: 10,
    minimumStock: 1,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-22T07:00:00.000Z"),
      receivedAt: new Date("2026-04-22T07:10:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitCost: 10,
          },
        ],
      },
    },
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-23T07:00:00.000Z"),
      receivedAt: new Date("2026-04-23T07:10:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitCost: 12,
          },
        ],
      },
    },
  });

  const productAfterPurchases = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  assert.equal(decimalToNumber(productAfterPurchases.currentStock), 20);
  assert.equal(decimalToNumber(productAfterPurchases.purchasePrice), 11);

  const output = await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-23T12:00:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 5,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert.equal(decimalToNumber(output.items[0]!.unitCost), 11);

  const outputMovement = await prisma.stockMovement.findFirstOrThrow({
    where: {
      productId: product.id,
      stockOutputItemId: output.items[0]!.id,
    },
  });
  assert.equal(decimalToNumber(outputMovement.quantity), 5);
  assert.equal(decimalToNumber(outputMovement.unitCost), 11);

  const entryMovements = await prisma.stockMovement.findMany({
    where: { productId: product.id, direction: "IN" },
    orderBy: { occurredAt: "asc" },
  });
  assert.deepEqual(
    entryMovements.map((movement) => decimalToNumber(movement.unitCost)),
    [10, 12],
  );
});

test("Sale pricing: suggested product price is snapshotted and real sale price can differ", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const product = await createProduct({
    name: "Bulk Notebook",
    purchasePrice: 1.2,
    salePrice: 3,
    minimumStock: 1,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-24T08:00:00.000Z"),
      receivedAt: new Date("2026-04-24T08:10:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 25,
            unitCost: 1.2,
          },
        ],
      },
    },
  });

  await prisma.product.update({
    where: { id: product.id },
    data: { salePrice: 3.2 },
  });

  const discountedOutput = await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-24T09:00:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 20,
            unitSalePrice: 2.8,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert.equal(
    decimalToNumber(discountedOutput.items[0]!.suggestedUnitSalePrice),
    3.2,
  );
  assert.equal(decimalToNumber(discountedOutput.items[0]!.unitSalePrice), 2.8);

  await prisma.product.update({
    where: { id: product.id },
    data: { salePrice: 3.5 },
  });

  const regularOutput = await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-24T10:00:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert.equal(
    decimalToNumber(regularOutput.items[0]!.suggestedUnitSalePrice),
    3.5,
  );
  assert.equal(decimalToNumber(regularOutput.items[0]!.unitSalePrice), 3.5);

  const firstSaleAfterPriceChange = await prisma.stockOutputItem.findUniqueOrThrow({
    where: { id: discountedOutput.items[0]!.id },
  });
  assert.equal(
    decimalToNumber(firstSaleAfterPriceChange.suggestedUnitSalePrice),
    3.2,
  );
  assert.equal(decimalToNumber(firstSaleAfterPriceChange.unitSalePrice), 2.8);

  const wasteOutput = await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "WASTE",
      occurredAt: new Date("2026-04-24T11:00:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            suggestedUnitSalePrice: 9,
            unitSalePrice: 9,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert.equal(wasteOutput.items[0]!.suggestedUnitSalePrice, null);
  assert.equal(wasteOutput.items[0]!.unitSalePrice, null);
});

test("RF-21/RF-22/RF-23/RF-24: in-house services consume supplies automatically and outsourced services only track status", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const paper = await createProduct({
    name: "Bond Paper",
    minimumStock: 5,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-22T06:00:00.000Z"),
      receivedAt: new Date("2026-04-22T06:05:00.000Z"),
      items: {
        create: [
          {
            productId: paper.id,
            quantity: 20,
            unitCost: 0.1,
          },
        ],
      },
    },
  });

  const copyService = await prisma.serviceType.create({
    data: {
      name: "Copies",
      kind: "IN_HOUSE",
      supplies: {
        create: [
          {
            productId: paper.id,
            quantityPerUnit: 2,
          },
        ],
      },
    },
  });

  await prisma.serviceRecord.create({
    data: {
      serviceTypeId: copyService.id,
      createdById: user.id,
      kind: "IN_HOUSE",
      status: "COMPLETED",
      quantity: 3,
      serviceDate: new Date("2026-04-22T14:00:00.000Z"),
    },
  });

  const paperAfterService = await prisma.product.findUniqueOrThrow({
    where: { id: paper.id },
  });
  assert.equal(decimalToNumber(paperAfterService.currentStock), 14);

  const serviceConsumption = await prisma.serviceConsumption.findFirstOrThrow({
    where: { productId: paper.id },
  });
  assert.equal(decimalToNumber(serviceConsumption.quantity), 6);

  await expectDbError(
    prisma.serviceType.update({
      where: { id: copyService.id },
      data: { kind: "OUTSOURCED" },
    }),
    "ServiceType.kind cannot change after service records exist",
  );

  const outsourcedType = await prisma.serviceType.create({
    data: {
      name: "External Printing",
      kind: "OUTSOURCED",
    },
  });

  await expectDbError(
    prisma.serviceRecord.create({
      data: {
        serviceTypeId: outsourcedType.id,
        createdById: user.id,
        kind: "OUTSOURCED",
        status: "DELIVERED",
        quantity: 1,
        serviceDate: new Date("2026-04-22T15:00:00.000Z"),
        externalVendorName: "Partner Shop",
      },
    }),
    "chk_service_records_status_delivered_at",
  );

  await prisma.serviceRecord.create({
    data: {
      serviceTypeId: outsourcedType.id,
      createdById: user.id,
      kind: "OUTSOURCED",
      status: "RECEIVED",
      quantity: 1,
      serviceDate: new Date("2026-04-22T15:00:00.000Z"),
      externalVendorName: "Partner Shop",
    },
  });

  const consumptionsAfterOutsourced = await prisma.serviceConsumption.findMany({
    where: { productId: paper.id },
  });
  assert.equal(consumptionsAfterOutsourced.length, 1);

  await expectDbError(
    prisma.serviceRecord.create({
      data: {
        serviceTypeId: outsourcedType.id,
        createdById: user.id,
        kind: "IN_HOUSE",
        status: "RECEIVED",
        quantity: 1,
        serviceDate: new Date("2026-04-22T15:10:00.000Z"),
      },
    }),
    "ServiceRecord.kind must match ServiceType.kind",
  );
});

test("RF-17/RF-18/RF-20/RF-25/RF-26/RF-28/RF-29: stock, alerts, movements, and services remain queryable for reports", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const snack = await createProduct({
    name: "Cookies",
    category: "SNACKS",
    minimumStock: 5,
  });
  const schoolSupply = await createProduct({
    name: "Marker",
    category: "SCHOOL_SUPPLIES",
    minimumStock: 2,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-20T08:00:00.000Z"),
      receivedAt: new Date("2026-04-20T08:15:00.000Z"),
      items: {
        create: [
          {
            productId: snack.id,
            quantity: 6,
            unitCost: 1,
          },
          {
            productId: schoolSupply.id,
            quantity: 4,
            unitCost: 1.5,
          },
        ],
      },
    },
  });

  await prisma.stockOutput.create({
    data: {
      createdById: user.id,
      reason: "SALE",
      occurredAt: new Date("2026-04-22T16:00:00.000Z"),
      items: {
        create: [
          {
            productId: snack.id,
            quantity: 2,
          },
          {
            productId: schoolSupply.id,
            quantity: 3,
          },
        ],
      },
    },
  });

  const serviceType = await prisma.serviceType.create({
    data: {
      name: "Homework Print",
      kind: "OUTSOURCED",
    },
  });

  await prisma.serviceRecord.create({
    data: {
      serviceTypeId: serviceType.id,
      createdById: user.id,
      kind: "OUTSOURCED",
      status: "DELIVERED",
      quantity: 1,
      serviceDate: new Date("2026-04-22T17:00:00.000Z"),
      deliveredAt: new Date("2026-04-22T18:00:00.000Z"),
      externalVendorName: "Third Party",
    },
  });

  const snackCatalog = await prisma.product.findMany({
    where: { category: "SNACKS" },
  });
  assert.equal(snackCatalog.length, 1);
  assert.equal(snackCatalog[0]!.id, snack.id);

  const lowStockRows = await db.schemaClient.query<{
    id: string;
  }>(
    `
      SELECT id
      FROM products
      WHERE current_stock <= minimum_stock
      ORDER BY id
    `,
  );
  assert.deepEqual(
    lowStockRows.rows.map((row) => row.id),
    [schoolSupply.id, snack.id].sort(),
  );

  const snackMovements = await prisma.stockMovement.findMany({
    where: {
      productId: snack.id,
      occurredAt: {
        gte: new Date("2026-04-20T00:00:00.000Z"),
        lte: new Date("2026-04-22T23:59:59.000Z"),
      },
    },
    orderBy: { occurredAt: "asc" },
  });
  assert.equal(snackMovements.length, 2);

  const serviceSummary = await prisma.serviceRecord.findMany({
    where: {
      serviceDate: {
        gte: new Date("2026-04-22T00:00:00.000Z"),
        lte: new Date("2026-04-22T23:59:59.000Z"),
      },
    },
  });
  assert.equal(serviceSummary.length, 1);
  assert.equal(serviceSummary[0]!.status, "DELIVERED");
});

test("Dashboard recent movements raw query uses the configured schema", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const product = await createProduct({
    name: "Dashboard Movement Product",
    minimumStock: 1,
  });

  await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "RECEIVED",
      orderedAt: new Date("2026-04-30T08:00:00.000Z"),
      receivedAt: new Date("2026-04-30T08:05:00.000Z"),
      items: {
        create: [
          {
            productId: product.id,
            quantity: 3,
            unitCost: 1,
          },
        ],
      },
    },
  });

  const { getRecentDashboardMovements } = await import(
    "../src/services/dashboard.service"
  );
  const movements = await getRecentDashboardMovements();

  assert.ok(
    movements.some(
      (movement) =>
        movement.product.name === product.name &&
        movement.movementType === "PURCHASE_ENTRY",
    ),
  );

  const prismaModule = await import("../src/lib/prisma");
  await prismaModule.default.$disconnect();
});

test("Soft delete extension: catalog deletes are hidden, restorable, and bypassable", async () => {
  const softPrisma = prisma.$extends(inventorySoftDeleteExtension);

  const supplier = await softPrisma.supplier.create({
    data: {
      name: "Soft Delete Supplier",
      ruc: "20999999991",
      phone: "999999999",
      contactName: "Soft Delete Contact",
    },
  });
  const product = await softPrisma.product.create({
    data: {
      name: "Soft Delete Product",
      category: "BAZAAR",
      unitName: "unit",
      purchasePrice: 3,
      minimumStock: 1,
    },
  });

  await softPrisma.productSupplier.create({
    data: {
      productId: product.id,
      supplierId: supplier.id,
      isPreferred: true,
    },
  });

  assert.equal(await softPrisma.supplier.count(), 1);

  const deletedSupplier = await softPrisma.supplier.delete({
    where: { id: supplier.id },
  });
  assert.ok(deletedSupplier.deletedAt);
  assert.equal(
    await softPrisma.supplier.findUnique({ where: { id: supplier.id } }),
    null,
  );
  assert.equal(
    await softPrisma.supplier.findFirst({ where: { id: supplier.id } }),
    null,
  );
  assert.equal(await softPrisma.supplier.count(), 0);

  await assert.rejects(() =>
    softPrisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } }),
  );
  await assert.rejects(() =>
    softPrisma.supplier.update({
      where: { id: supplier.id },
      data: { notes: "This should stay hidden" },
    }),
  );
  await assert.rejects(() =>
    softPrisma.supplier.upsert({
      where: { id: supplier.id },
      update: { notes: "Unsafe upsert" },
      create: {
        name: "Unsafe Upsert Supplier",
        ruc: "20999999992",
        phone: "999999999",
        contactName: "Unsafe Upsert Contact",
      },
    }),
    /Upsert is disabled/,
  );

  const rawDeletedSupplier = await prisma.supplier.findUniqueOrThrow({
    where: { id: supplier.id },
  });
  assert.ok(rawDeletedSupplier.deletedAt);

  const explicitlyDeletedSuppliers = await softPrisma.supplier.findMany({
    where: { deletedAt: { not: null } },
  });
  assert.deepEqual(
    explicitlyDeletedSuppliers.map((row) => row.id),
    [supplier.id],
  );

  const supplierAggregate = await softPrisma.supplier.aggregate({
    _count: { _all: true },
  });
  assert.equal(supplierAggregate._count._all, 0);

  const restoredSupplier = await softPrisma.supplier.restore({
    id: supplier.id,
  });
  assert.equal(restoredSupplier.deletedAt, null);
  assert.equal(await softPrisma.supplier.count(), 1);

  const deletedLink = await softPrisma.productSupplier.delete({
    where: {
      productId_supplierId: {
        productId: product.id,
        supplierId: supplier.id,
      },
    },
  });
  assert.ok(deletedLink.deletedAt);
  assert.equal(
    await softPrisma.productSupplier.count({
      where: { productId: product.id },
    }),
    0,
  );

  await softPrisma.productSupplier.restore({
    productId_supplierId: {
      productId: product.id,
      supplierId: supplier.id,
    },
  });
  assert.equal(
    await softPrisma.productSupplier.count({
      where: { productId: product.id },
    }),
    1,
  );

  assert.equal(
    (
      await softPrisma.supplier.deleteMany({
        where: { ruc: { startsWith: "2099999999" } },
      })
    ).count,
    1,
  );
  assert.equal(
    (
      await softPrisma.supplier.deleteMany({
        where: { ruc: { startsWith: "2099999999" } },
      })
    ).count,
    0,
  );
  assert.equal(
    (await softPrisma.supplier.restoreMany({ ruc: supplier.ruc })).count,
    1,
  );

  const hardDeletedSupplier = await softPrisma.supplier.hardDelete({
    id: supplier.id,
  });
  assert.equal(hardDeletedSupplier.id, supplier.id);
  assert.equal(
    await prisma.supplier.findUnique({ where: { id: supplier.id } }),
    null,
  );
});

test("Soft delete extension does not replace append-only history protections", async () => {
  const softPrisma = prisma.$extends(inventorySoftDeleteExtension);
  const user = await createUser();
  const supplier = await createSupplier();
  const entry = await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "ORDERED",
    },
  });

  await expectDbError(
    softPrisma.stockEntry.delete({ where: { id: entry.id } }),
    "append-only",
  );
  await assert.rejects(
    () => softPrisma.stockEntry.restore({ id: entry.id }),
    /not configured for soft delete/,
  );
});
