import { Suspense } from "react";

import {
  DateRangeFilter,
  FilterBar,
  SelectFilter,
} from "@/components/filters";
import { ReportsEntriesTable } from "@/components/reports/entries-table";
import { LowStockTable } from "@/components/reports/low-stock-table";
import { ReportMetric } from "@/components/reports/metric";
import { MovementsTable } from "@/components/reports/movements-table";
import { ReportsOutputsTable } from "@/components/reports/outputs-table";
import { ReportsServicesTable } from "@/components/reports/services-table";
import { PageContentSkeleton, Section } from "@/components/shared";
import {
  dateRangeWhere,
  defaultRangeStrings,
  sumLineCost,
  sumLineRevenue,
} from "@/lib/calc";
import { getDatabaseConnection } from "@/lib/database-url";
import { formatCurrency, productCategoryLabels } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "../../../../prisma/generated/client";
import type { ProductCategory } from "../../../../prisma/generated/client";

type ReportsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    category?: ProductCategory;
    productId?: string;
    supplierId?: string;
  }>;
};

const categories: ProductCategory[] = ["SCHOOL_SUPPLIES", "BAZAAR", "SNACKS"];

export default function ReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportsContent({ searchParams }: ReportsPageProps) {
  const [, params] = await Promise.all([
    requireRole(["ADMIN"], "/reports"),
    searchParams,
  ]);
  const fallback = defaultRangeStrings(30);
  const from = params.from ?? fallback.from;
  const to = params.to ?? fallback.to;
  const dateFilter = dateRangeWhere(from, to);
  const category = params.category;
  const productId = params.productId || undefined;
  const supplierId = params.supplierId || undefined;

  // Fetch only the columns needed for the dropdowns. Inventory metrics
  // (value, low/out counts) are computed in the DB to avoid transferring
  // 500+ Decimal rows just to sum/filter them in JS.
  const [
    productOptions,
    supplierOptions,
    inventoryMetrics,
    movements,
    entries,
    outputs,
    services,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 300,
    }),
    getInventoryMetrics(category),
    prisma.stockMovement.findMany({
      where: {
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
        ...(productId ? { productId } : {}),
        ...(category ? { product: { category } } : {}),
      },
      include: {
        product: { select: { name: true, category: true, unitName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 150,
    }),
    prisma.stockEntry.findMany({
      where: {
        ...(dateFilter ? { orderedAt: dateFilter } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { orderedAt: "desc" },
      take: 100,
    }),
    prisma.stockOutput.findMany({
      where: {
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
        ...(productId ? { items: { some: { productId } } } : {}),
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 120,
    }),
    prisma.serviceRecord.findMany({
      where: {
        ...(dateFilter ? { serviceDate: dateFilter } : {}),
      },
      include: {
        serviceType: { select: { name: true } },
        consumptions: { include: { product: { select: { name: true } } } },
      },
      orderBy: { serviceDate: "desc" },
      take: 120,
    }),
  ]);

  const purchaseTotal = entries.reduce(
    (sum, entry) => sum + sumLineCost(entry.items),
    0,
  );
  const saleItems = outputs.flatMap((output) =>
    output.reason === "SALE" ? output.items : [],
  );
  const saleRevenue = sumLineRevenue(saleItems);
  const saleCost = sumLineCost(saleItems);
  const outputCost = outputs.reduce(
    (sum, output) => sum + sumLineCost(output.items),
    0,
  );

  return (
    <div>
      <Section className="mb-5">
        <FilterBar className="border-b-0">
          <DateRangeFilter
            allowClear={false}
            fallbackFromValue={from}
            fallbackToValue={to}
            label="Periodo"
            placeholder="Ultimos 30 dias"
          />
          <SelectFilter
            allLabel="Todas"
            label="Categoria"
            name="category"
            options={categories.map((item) => ({
              label: productCategoryLabels[item],
              value: item,
            }))}
          />
          <SelectFilter
            allLabel="Todos"
            label="Producto"
            name="productId"
            options={productOptions.map((product) => ({
              label: product.name,
              value: product.id,
            }))}
          />
          <SelectFilter
            allLabel="Todos"
            label="Proveedor"
            name="supplierId"
            options={supplierOptions.map((supplier) => ({
              label: supplier.name,
              value: supplier.id,
            }))}
          />
        </FilterBar>
      </Section>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          label="Valor inventario"
          value={formatCurrency(inventoryMetrics.inventoryValue)}
        />
        <ReportMetric label="Compras periodo" value={formatCurrency(purchaseTotal)} />
        <ReportMetric label="Ingresos ventas" value={formatCurrency(saleRevenue)} />
        <ReportMetric
          label="Utilidad bruta"
          value={formatCurrency(saleRevenue - saleCost)}
        />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <ReportMetric
          label="Bajo stock"
          value={String(inventoryMetrics.lowStockCount)}
        />
        <ReportMetric
          label="Sin stock"
          value={String(inventoryMetrics.outOfStockCount)}
        />
        <ReportMetric label="Costo salidas" value={formatCurrency(outputCost)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MovementsTable movements={movements} />
        <LowStockTable products={inventoryMetrics.lowStockList} />
        <ReportsEntriesTable entries={entries} />
        <ReportsOutputsTable outputs={outputs} />
      </div>

      <ReportsServicesTable services={services} />
    </div>
  );
}

type InventoryMetrics = {
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockList: {
    id: string;
    name: string;
    category: ProductCategory;
    currentStock: string;
    minimumStock: string;
    purchasePrice: string;
  }[];
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function getInventoryMetrics(
  category: ProductCategory | undefined,
): Promise<InventoryMetrics> {
  const schema = Prisma.raw(quoteIdentifier(getDatabaseConnection().schema));
  const categoryFilter = category
    ? Prisma.sql`AND category::text = ${category}`
    : Prisma.empty;

  const [aggregateRows, lowStockRows] = await Promise.all([
    prisma.$queryRaw<
      {
        inventoryValue: string | null;
        outOfStockCount: bigint;
        lowStockCount: bigint;
      }[]
    >`
      SELECT
        coalesce(sum(current_stock * purchase_price), 0)::text AS "inventoryValue",
        count(*) FILTER (WHERE current_stock <= 0) AS "outOfStockCount",
        count(*) FILTER (WHERE current_stock <= minimum_stock) AS "lowStockCount"
      FROM ${schema}.products
      WHERE is_active = TRUE
      ${categoryFilter}
    `,
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        category: ProductCategory;
        currentStock: string;
        minimumStock: string;
        purchasePrice: string;
      }[]
    >`
      SELECT
        id::text                AS "id",
        name                    AS "name",
        category::text          AS "category",
        current_stock::text     AS "currentStock",
        minimum_stock::text     AS "minimumStock",
        purchase_price::text    AS "purchasePrice"
      FROM ${schema}.products
      WHERE is_active = TRUE
        AND current_stock <= minimum_stock
        ${categoryFilter}
      ORDER BY current_stock ASC, name ASC
      LIMIT 50
    `,
  ]);

  const aggregate = aggregateRows[0];
  return {
    inventoryValue: Number(aggregate?.inventoryValue ?? "0"),
    lowStockCount: Number(aggregate?.lowStockCount ?? BigInt(0)),
    outOfStockCount: Number(aggregate?.outOfStockCount ?? BigInt(0)),
    lowStockList: lowStockRows,
  };
}
