import {
  DataTable,
  EmptyState,
  PaginationBar,
  ProductCategoryBadge,
  Section,
  StatusBadge,
} from "@/components/shared";
import type { ReactNode } from "react";
import { getDatabaseConnection } from "@/lib/database-url";
import { decimalToNumber, formatDate, formatDecimal, movementTypeLabels } from "@/lib/format";
import { buildPaginationMeta, readPagination } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import {
  Prisma,
  type ProductCategory,
  type StockMovementType,
} from "../../../prisma/generated/client";

type StockRow = {
  id: string;
  name: string;
  category: ProductCategory;
  unitName: string;
  currentStock: string;
  minimumStock: string;
  lastMovementType: StockMovementType | null;
  lastMovementAt: Date | null;
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

type StockListParams = {
  q?: string;
  category?: ProductCategory;
  status?: "all" | "low" | "out";
  page?: string;
  pageSize?: string;
};

export async function StockTable({
  filters,
  params,
}: {
  filters?: ReactNode;
  params: StockListParams;
}) {
  const q = params.q?.trim() ?? "";
  const category = params.category;
  const status = params.status ?? "all";
  const pagination = readPagination(params);

  const schema = Prisma.raw(quoteIdentifier(getDatabaseConnection().schema));
  const qPattern = q ? `%${q}%` : null;

  const whereSql = Prisma.sql`
    WHERE product.is_active = TRUE
      ${qPattern ? Prisma.sql`AND product.name ILIKE ${qPattern}` : Prisma.empty}
      ${category ? Prisma.sql`AND product.category::text = ${category}` : Prisma.empty}
      ${
        status === "out"
          ? Prisma.sql`AND product.current_stock <= 0`
          : status === "low"
            ? Prisma.sql`AND product.current_stock <= product.minimum_stock`
            : Prisma.empty
      }
  `;

  // Single query: products + latest movement via lateral join.
  // Replaces the previous N+1 (one extra query per product for stockMovements take:1).
  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<StockRow[]>`
      SELECT
        product.id::text          AS "id",
        product.name              AS "name",
        product.category::text    AS "category",
        product.unit_name         AS "unitName",
        product.current_stock::text AS "currentStock",
        product.minimum_stock::text AS "minimumStock",
        latest.movement_type::text AS "lastMovementType",
        latest.occurred_at        AS "lastMovementAt"
      FROM ${schema}.products product
      LEFT JOIN LATERAL (
        SELECT m.movement_type, m.occurred_at
        FROM ${schema}.stock_movements m
        WHERE m.product_id = product.id
        ORDER BY m.occurred_at DESC
        LIMIT 1
      ) latest ON TRUE
      ${whereSql}
      ORDER BY product.category ASC, product.name ASC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM ${schema}.products product
      ${whereSql}
    `,
  ]);

  const totalItems = Number(totalRows[0]?.count ?? BigInt(0));
  const meta = buildPaginationMeta(totalItems, pagination);

  if (!rows.length) {
    return (
      <Section>
        {filters}
        <EmptyState
          title="Sin productos"
          description="No hay stock con esos filtros."
        />
      </Section>
    );
  }

  return (
    <Section>
      {filters}
      <DataTable
        headers={[
          "Producto",
          "Categoria",
          "Stock",
          "Minimo",
          "Unidad",
          "Estado",
          "Ultimo movimiento",
        ]}
      >
        {rows.map((row) => {
          const current = decimalToNumber(row.currentStock);
          const minimum = decimalToNumber(row.minimumStock);
          const tone =
            current <= 0 ? "error" : current <= minimum ? "warning" : "success";
          const stateLabel =
            current <= 0 ? "Sin stock" : current <= minimum ? "Bajo" : "OK";

          return (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-foreground">
                {row.name}
              </td>
              <td className="px-4 py-3">
                <ProductCategoryBadge category={row.category} />
              </td>
              <td className="px-4 py-3">{formatDecimal(row.currentStock, 3)}</td>
              <td className="px-4 py-3">{formatDecimal(row.minimumStock, 3)}</td>
              <td className="px-4 py-3">{row.unitName}</td>
              <td className="px-4 py-3">
                <StatusBadge tone={tone}>{stateLabel}</StatusBadge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.lastMovementType && row.lastMovementAt
                  ? `${movementTypeLabels[row.lastMovementType]} - ${formatDate(row.lastMovementAt)}`
                  : "-"}
              </td>
            </tr>
          );
        })}
      </DataTable>
      <PaginationBar {...meta} />
    </Section>
  );
}
