import { RecentOutputItem } from "@/components/outputs/recent-output-item";
import type { ReactNode } from "react";
import {
  DataTable,
  EmptyState,
  PaginationBar,
  ProductCategoryBadge,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import { dateRangeWhere, sumLineCost, sumLineRevenue } from "@/lib/calc";
import {
  formatCurrency,
  formatDate,
  formatDecimal,
  stockOutputReasonLabels,
} from "@/lib/format";
import { buildPaginationMeta, readPagination } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import type { StockOutputReason } from "../../../prisma/generated/client";

export type OutputsSearchParams = {
  from?: string;
  to?: string;
  reason?: StockOutputReason;
  page?: string;
  pageSize?: string;
};

export async function OutputsList({
  filters,
  searchParams,
}: {
  filters?: ReactNode;
  searchParams: OutputsSearchParams;
}) {
  const occurredAtFilter = dateRangeWhere(searchParams.from, searchParams.to);
  const pagination = readPagination(searchParams);

  const where = {
    ...(occurredAtFilter ? { occurredAt: occurredAtFilter } : {}),
    ...(searchParams.reason ? { reason: searchParams.reason } : {}),
  };

  const [outputs, totalItems] = await Promise.all([
    prisma.stockOutput.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { name: true, unitName: true, category: true } },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.stockOutput.count({ where }),
  ]);

  const meta = buildPaginationMeta(totalItems, pagination);

  const summary = outputs.reduce(
    (acc, output) => ({
      cost: acc.cost + sumLineCost(output.items),
      revenue: acc.revenue + sumLineRevenue(output.items),
      items: acc.items + output.items.length,
    }),
    { cost: 0, revenue: 0, items: 0 },
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <Section>
        <SectionHeader title="Historial completo" />
        {filters}
        {outputs.length ? (
          <DataTable
            headers={["Motivo", "Fecha", "Creado por", "Items", "Costo", "Ingreso"]}
          >
            {outputs.map((output) => {
              const cost = sumLineCost(output.items);
              const revenue = sumLineRevenue(output.items);

              return (
                <tr key={output.id}>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={output.reason === "SALE" ? "success" : "warning"}
                    >
                      {stockOutputReasonLabels[output.reason]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">{formatDate(output.occurredAt)}</td>
                  <td className="px-4 py-3">
                    {output.createdBy.firstName} {output.createdBy.lastName}
                  </td>
                  <td className="relative w-40 px-4 py-3">
                    <details className="relative [&_summary::-webkit-details-marker]:hidden">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                        {output.items.length} item{output.items.length !== 1 ? "s" : ""}
                      </summary>
                      <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-card border border-border bg-surface p-2 shadow-md">
                        <ul className="space-y-1.5">
                          {output.items.map((item) => (
                            <li className="flex items-center gap-2" key={item.id}>
                              <span className="min-w-0 flex-1 text-xs">
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-muted-foreground">
                                  {" "}— {formatDecimal(item.quantity, 0)} {item.product.unitName}
                                </span>
                              </span>
                              <ProductCategoryBadge
                                category={item.product.category}
                                className="shrink-0 min-h-5 rounded-control px-1.5 py-0 text-[10px]"
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(cost)}</td>
                  <td className="px-4 py-3">
                    {output.reason === "SALE" ? formatCurrency(revenue) : "-"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState
            title="Sin salidas"
            description="Sin resultados para los filtros."
          />
        )}
        <PaginationBar {...meta} />
      </Section>

      <aside className="space-y-3">
        <Section>
          <SectionHeader title="Resumen rapido" />
          <div className="space-y-3 p-4">
            <SummaryRow label="Salidas visibles" value={String(outputs.length)} />
            <SummaryRow label="Items retirados" value={String(summary.items)} />
            <SummaryRow
              label="Ingreso ventas"
              value={formatCurrency(summary.revenue)}
            />
            <SummaryRow label="Costo salidas" value={formatCurrency(summary.cost)} />
          </div>
        </Section>

        <Section>
          <SectionHeader title="Salidas recientes" />
          {outputs.length ? (
            <div className="divide-y divide-border">
              {outputs.slice(0, 5).map((output) => (
                <RecentOutputItem key={output.id} output={output} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin salidas"
              description="Sin resultados para los filtros."
            />
          )}
        </Section>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-muted px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
