import { decimalToNumber } from "@/lib/format";
import { getRange } from "@/lib/date-range";
import { getDatabaseConnection } from "@/lib/database-url";
import prisma from "@/lib/prisma";
import { Prisma } from "../../prisma/generated/client";
import type {
  StockMovementDirection,
  StockMovementType,
} from "../../prisma/generated/client";

export type DashboardTodayCounts = {
  entriesToday: number;
  outputsToday: number;
  salesToday: number;
  wasteToday: number;
  servicesToday: number;
};

export async function getDashboardTodayCounts(): Promise<DashboardTodayCounts> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const schema = Prisma.raw(quoteIdentifier(getDatabaseConnection().schema));
  const rows = await prisma.$queryRaw<
    {
      entriesToday: bigint;
      outputsToday: bigint;
      salesToday: bigint;
      wasteToday: bigint;
      servicesToday: bigint;
    }[]
  >`
    SELECT
      (SELECT count(*) FROM ${schema}.stock_entries
        WHERE created_at BETWEEN ${todayStart} AND ${todayEnd}) AS "entriesToday",
      (SELECT count(*) FROM ${schema}.stock_outputs
        WHERE occurred_at BETWEEN ${todayStart} AND ${todayEnd}) AS "outputsToday",
      (SELECT count(*) FROM ${schema}.stock_outputs
        WHERE occurred_at BETWEEN ${todayStart} AND ${todayEnd}
          AND reason = 'SALE') AS "salesToday",
      (SELECT count(*) FROM ${schema}.stock_outputs
        WHERE occurred_at BETWEEN ${todayStart} AND ${todayEnd}
          AND reason = 'WASTE') AS "wasteToday",
      (SELECT count(*) FROM ${schema}.service_records
        WHERE service_date BETWEEN ${todayStart} AND ${todayEnd}) AS "servicesToday"
  `;

  const row = rows[0];
  return {
    entriesToday: Number(row?.entriesToday ?? BigInt(0)),
    outputsToday: Number(row?.outputsToday ?? BigInt(0)),
    salesToday: Number(row?.salesToday ?? BigInt(0)),
    wasteToday: Number(row?.wasteToday ?? BigInt(0)),
    servicesToday: Number(row?.servicesToday ?? BigInt(0)),
  };
}

export type DashboardInventoryStats = {
  inventoryCost: number;
  outOfStockCount: number;
  lowStockCount: number;
  attention: {
    id: string;
    name: string;
    sku: string | null;
    currentStock: string;
    minimumStock: string;
    status: "out" | "low";
  }[];
};

export async function getDashboardInventoryStats(): Promise<DashboardInventoryStats> {
  const schema = Prisma.raw(quoteIdentifier(getDatabaseConnection().schema));

  const [statsRows, attentionRows] = await Promise.all([
    prisma.$queryRaw<
      {
        inventoryCost: string | null;
        outOfStockCount: bigint;
        lowStockCount: bigint;
      }[]
    >`
      SELECT
        coalesce(sum(current_stock * purchase_price), 0)::text AS "inventoryCost",
        count(*) FILTER (WHERE current_stock <= 0) AS "outOfStockCount",
        count(*) FILTER (WHERE current_stock > 0 AND current_stock <= minimum_stock) AS "lowStockCount"
      FROM ${schema}.products
      WHERE is_active = TRUE
    `,
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        sku: string | null;
        currentStock: string;
        minimumStock: string;
        status: "out" | "low";
      }[]
    >`
      WITH ranked_attention AS (
        SELECT
          id,
          name,
          sku,
          current_stock,
          minimum_stock,
          CASE WHEN current_stock <= 0 THEN 'out' ELSE 'low' END AS status,
          row_number() OVER (
            PARTITION BY CASE WHEN current_stock <= 0 THEN 'out' ELSE 'low' END
            ORDER BY name ASC, id ASC
          ) AS status_rank
        FROM ${schema}.products
        WHERE is_active = TRUE
          AND current_stock <= minimum_stock
      )
      SELECT
        id::text             AS "id",
        name                 AS "name",
        sku                  AS "sku",
        current_stock::text  AS "currentStock",
        minimum_stock::text  AS "minimumStock",
        status               AS "status"
      FROM ranked_attention
      WHERE status_rank <= 5
      ORDER BY
        CASE WHEN status = 'out' THEN 0 ELSE 1 END,
        name ASC,
        id ASC
    `,
  ]);

  const stats = statsRows[0];
  return {
    inventoryCost: Number(stats?.inventoryCost ?? "0"),
    outOfStockCount: Number(stats?.outOfStockCount ?? BigInt(0)),
    lowStockCount: Number(stats?.lowStockCount ?? BigInt(0)),
    attention: attentionRows,
  };
}

export type DashboardFinancialSummary = {
  grossProfit: number;
  rangeDetail: string;
  rangeKey: ReturnType<typeof getRange>["key"];
  rangeLabel: string;
  revenue: number;
  revenueChange: number;
};

export async function getDashboardFinancialSummary(
  rangeValue: string | undefined,
): Promise<DashboardFinancialSummary> {
  const range = getRange(rangeValue);
  const [saleItemsRange, saleItemsPrevious] = await Promise.all([
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: "SALE",
          occurredAt: { gte: range.start, lte: range.end },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: "SALE",
          occurredAt: { gte: range.previousStart, lte: range.previousEnd },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
  ]);

  const revenue = saleItemsRange.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const cogs = saleItemsRange.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );
  const previousRevenue = saleItemsPrevious.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const revenueChange =
    previousRevenue > 0
      ? ((revenue - previousRevenue) / previousRevenue) * 100
      : revenue > 0
        ? 100
        : 0;

  return {
    grossProfit: revenue - cogs,
    rangeDetail: range.detail,
    rangeKey: range.key,
    rangeLabel: range.label,
    revenue,
    revenueChange,
  };
}

export type DashboardMovement = {
  direction: StockMovementDirection;
  id: string;
  movementType: StockMovementType;
  occurredAt: string;
  performedBy: { firstName: string } | null;
  performedById: string | null;
  product: { name: string; sku: string | null };
  quantity: string;
};

type RawDashboardMovement = {
  direction: StockMovementDirection;
  id: string;
  movementType: StockMovementType;
  occurredAt: Date;
  performedByFirstName: string | null;
  performedById: string | null;
  productName: string;
  productSku: string | null;
  quantity: string;
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function getRecentDashboardMovements(): Promise<DashboardMovement[]> {
  const schema = Prisma.raw(quoteIdentifier(getDatabaseConnection().schema));
  const rows = await prisma.$queryRaw<RawDashboardMovement[]>`
    SELECT
      ranked.id::text AS "id",
      ranked.movement_type::text AS "movementType",
      ranked.direction::text AS "direction",
      ranked.quantity::text AS "quantity",
      ranked.occurred_at AS "occurredAt",
      ranked.performed_by_id::text AS "performedById",
      product.name AS "productName",
      product.sku AS "productSku",
      performer.first_name AS "performedByFirstName"
    FROM (
      SELECT
        movement.*,
        row_number() OVER (
          PARTITION BY movement.movement_type
          ORDER BY movement.occurred_at DESC
        ) AS type_rank
      FROM ${schema}.stock_movements movement
      WHERE movement.movement_type::text IN (
        'PURCHASE_ENTRY',
        'SALE',
        'WASTE',
        'INTERNAL_USE',
        'SERVICE_CONSUMPTION'
      )
    ) ranked
    INNER JOIN ${schema}.products product ON product.id = ranked.product_id
    LEFT JOIN ${schema}.users performer ON performer.id = ranked.performed_by_id
    WHERE ranked.type_rank <= 5
    ORDER BY ranked.occurred_at DESC
  `;

  return rows.map((row) => ({
    direction: row.direction,
    id: row.id,
    movementType: row.movementType,
    occurredAt: row.occurredAt.toISOString(),
    performedBy: row.performedByFirstName
      ? { firstName: row.performedByFirstName }
      : null,
    performedById: row.performedById,
    product: {
      name: row.productName,
      sku: row.productSku,
    },
    quantity: row.quantity,
  }));
}
