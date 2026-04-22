import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import type { PrismaClient } from "../prisma/generated/client";
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
      fullName: "System User",
      passwordHash: "hashed_password",
      role: "ADMIN",
    },
  });
}

async function createSupplier(overrides: Record<string, any> = {}) {
  return prisma.supplier.create({
    data: {
      name: `Supplier ${Math.random().toString(36).slice(2, 8)}`,
      taxId: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      phone: "999999999",
      contactName: "Main Contact",
      ...overrides,
    },
  });
}

async function createProduct(overrides: Record<string, any> = {}) {
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
    taxId: "20111111111",
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
    createSupplier({
      name: "Supplier Beta",
      taxId: "20111111111",
    }),
    "tax_id",
  );
});

test("RF-03/RF-09/RF-10/RF-11: snacks require lot metadata and only RECEIVED entries increase stock", async () => {
  const user = await createUser();
  const supplier = await createSupplier();
  const snack = await createProduct({
    name: "Chocolate Bar",
    category: "SNACKS",
    minimumStock: 5,
  });

  const orderedEntry = await prisma.stockEntry.create({
    data: {
      supplierId: supplier.id,
      createdById: user.id,
      status: "ORDERED",
      orderedAt: new Date("2026-04-22T10:00:00.000Z"),
    },
  });

  await expectDbError(
    prisma.stockEntryItem.create({
      data: {
        stockEntryId: orderedEntry.id,
        productId: snack.id,
        quantity: 12,
        unitCost: 1.4,
      },
    }),
    "Snack stock entry items require lot_number",
  );

  await prisma.stockEntryItem.create({
    data: {
      stockEntryId: orderedEntry.id,
      productId: snack.id,
      quantity: 12,
      unitCost: 1.4,
      lotNumber: "LOT-001",
      expirationDate: new Date("2026-04-28T00:00:00.000Z"),
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

  const inventoryLot = await prisma.inventoryLot.findFirstOrThrow({
    where: { productId: snack.id, lotNumber: "LOT-001" },
  });
  assert.equal(decimalToNumber(inventoryLot.currentQuantity), 12);

  const movements = await prisma.stockMovement.findMany({
    where: { productId: snack.id },
  });
  assert.equal(movements.length, 1);
  assert.equal(movements[0]?.movementType, "PURCHASE_ENTRY");
  assert.equal(movements[0]?.direction, "IN");
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
  const supplierA = await createSupplier({ taxId: "20900000001" });
  const supplierB = await createSupplier({ taxId: "20900000002" });

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

test("RF-13/RF-14/RF-15: outputs deduct stock, prevent overselling, and consume snack lots using FEFO", async () => {
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
            lotNumber: "EARLY",
            expirationDate: new Date("2026-04-24T00:00:00.000Z"),
          },
          {
            productId: snack.id,
            quantity: 8,
            unitCost: 0.8,
            lotNumber: "LATE",
            expirationDate: new Date("2026-05-01T00:00:00.000Z"),
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

  const lots = await prisma.inventoryLot.findMany({
    where: { productId: snack.id },
    orderBy: { expirationDate: "asc" },
  });
  assert.equal(decimalToNumber(lots[0]!.currentQuantity), 0);
  assert.equal(decimalToNumber(lots[1]!.currentQuantity), 7);

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

  assert.equal(outputMovements.length, 2);
  assert.deepEqual(
    outputMovements.map((movement) => decimalToNumber(movement.quantity)),
    [5, 1],
  );
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

  const outsourcedType = await prisma.serviceType.create({
    data: {
      name: "External Printing",
      kind: "OUTSOURCED",
    },
  });

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

test("RF-17/RF-18/RF-19/RF-20/RF-25/RF-26/RF-27/RF-28/RF-29: stock, alerts, movements, and services remain queryable for reports", async () => {
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
            lotNumber: "REPORT-LOT",
            expirationDate: new Date("2026-04-26T00:00:00.000Z"),
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

  const expiringLots = await db.schemaClient.query<{
    product_id: string;
  }>(
    `
      SELECT product_id
      FROM inventory_lots
      WHERE expiration_date <= DATE '2026-04-29'
      ORDER BY product_id
    `,
  );
  assert.deepEqual(expiringLots.rows.map((row) => row.product_id), [snack.id]);

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
