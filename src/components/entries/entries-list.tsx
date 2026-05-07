import { PackageCheck } from "lucide-react";

import {
  ActionTip,
  DataTable,
  EmptyState,
  IdActionForm,
  PaginationBar,
  Section,
  StatusBadge,
  iconBtnGood,
} from "@/components/shared";
import { dateRangeWhere, sumLineCost } from "@/lib/calc";
import {
  formatCurrency,
  formatDate,
  formatDecimal,
  stockEntryStatusLabels,
} from "@/lib/format";
import { buildPaginationMeta, readPagination } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import { receiveStockEntry } from "@/server/actions";
import type { StockEntryStatus } from "../../../prisma/generated/client";

export type EntriesSearchParams = {
  q?: string;
  from?: string;
  to?: string;
  status?: StockEntryStatus;
  supplierId?: string;
  page?: string;
  pageSize?: string;
};

export async function EntriesList({
  searchParams,
}: {
  searchParams: EntriesSearchParams;
}) {
  const q = searchParams.q?.trim();
  const orderedAtFilter = dateRangeWhere(searchParams.from, searchParams.to);
  const pagination = readPagination(searchParams);

  const where = {
    ...(orderedAtFilter ? { orderedAt: orderedAtFilter } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.supplierId ? { supplierId: searchParams.supplierId } : {}),
    ...(q
      ? { referenceNumber: { contains: q, mode: "insensitive" as const } }
      : {}),
  };

  const [entries, totalItems] = await Promise.all([
    prisma.stockEntry.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { name: true, unitName: true } },
          },
        },
      },
      orderBy: { orderedAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.stockEntry.count({ where }),
  ]);

  const meta = buildPaginationMeta(totalItems, pagination);

  if (!entries.length) {
    return (
      <Section>
        <EmptyState
          title="Sin entradas"
          description="Sin resultados para los filtros."
        />
      </Section>
    );
  }

  return (
    <Section>
      <DataTable
        headers={[
          "Referencia",
          "Proveedor",
          "Estado",
          "Fecha",
          "Items",
          "Total",
          "Acciones",
        ]}
      >
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-foreground">
                {entry.referenceNumber || entry.id.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.createdBy.firstName} {entry.createdBy.lastName}
              </p>
            </td>
            <td className="px-4 py-3">{entry.supplier.name}</td>
            <td className="px-4 py-3">
              <StatusBadge tone={entry.status === "RECEIVED" ? "success" : "info"}>
                {stockEntryStatusLabels[entry.status]}
              </StatusBadge>
            </td>
            <td className="px-4 py-3">
              <p>{formatDate(entry.orderedAt)}</p>
              <p className="text-xs text-muted-foreground">
                Recibida: {formatDate(entry.receivedAt)}
              </p>
            </td>
            <td className="relative w-40 px-4 py-3">
              <details className="relative">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                  {entry.items.length} item{entry.items.length !== 1 ? "s" : ""}
                </summary>
                <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-card border border-border bg-surface p-2 shadow-md">
                  <ul className="space-y-1">
                    {entry.items.map((item) => (
                      <li className="text-xs text-foreground" key={item.id}>
                        <span className="font-medium">{item.product.name}</span>
                        <span className="text-muted-foreground">
                          {" "}— {formatDecimal(item.quantity, 0)} × {formatCurrency(item.unitCost)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </td>
            <td className="px-4 py-3">
              {formatCurrency(sumLineCost(entry.items))}
            </td>
            <td className="px-4 py-3">
              {entry.status === "ORDERED" ? (
                <ActionTip label="Recibir">
                  <IdActionForm
                    action={receiveStockEntry}
                    className={iconBtnGood}
                    id={entry.id}
                    label="Recibir"
                  >
                    <PackageCheck aria-hidden="true" data-icon="icon" />
                  </IdActionForm>
                </ActionTip>
              ) : (
                <span className="text-xs text-muted-foreground">Aplicada</span>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      <PaginationBar {...meta} />
    </Section>
  );
}
