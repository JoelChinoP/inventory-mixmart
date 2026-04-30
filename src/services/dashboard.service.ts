import { decimalToNumber } from "@/lib/format";
import { getRange } from "@/lib/date-range";
import { getDatabaseConnection } from "@/lib/database-url";
import prisma from "@/lib/prisma";
import { Prisma } from "../../prisma/generated/client";
import type {
  StockMovementDirection,
  StockMovementType,
} from "../../prisma/generated/client";

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
