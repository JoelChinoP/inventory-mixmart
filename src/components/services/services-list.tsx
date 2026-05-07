import {
  DataTable,
  EmptyState,
  PaginationBar,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import type { ReactNode } from "react";
import { dateRangeWhere } from "@/lib/calc";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  serviceKindLabels,
  serviceStatusLabels,
} from "@/lib/format";
import { buildPaginationMeta, readPagination } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import type {
  ServiceKind,
  ServiceStatus,
} from "../../../prisma/generated/client";

export type ServicesSearchParams = {
  from?: string;
  to?: string;
  kind?: ServiceKind;
  status?: ServiceStatus;
  serviceTypeId?: string;
  page?: string;
  pageSize?: string;
};

export async function ServicesList({
  filters,
  searchParams,
}: {
  filters?: ReactNode;
  searchParams: ServicesSearchParams;
}) {
  const dateFilter = dateRangeWhere(searchParams.from, searchParams.to);
  const pagination = readPagination(searchParams);

  const where = {
    ...(dateFilter ? { serviceDate: dateFilter } : {}),
    ...(searchParams.kind ? { kind: searchParams.kind } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.serviceTypeId
      ? { serviceTypeId: searchParams.serviceTypeId }
      : {}),
  };

  const [records, totalItems] = await Promise.all([
    prisma.serviceRecord.findMany({
      where,
      include: {
        serviceType: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        consumptions: {
          include: {
            product: {
              select: { name: true, unitName: true, purchasePrice: true },
            },
          },
        },
      },
      orderBy: { serviceDate: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.serviceRecord.count({ where }),
  ]);

  const meta = buildPaginationMeta(totalItems, pagination);

  return (
    <Section>
      <SectionHeader title="Servicios recientes" />
      {filters}
      {records.length ? (
        <DataTable
          headers={[
            "Servicio",
            "Tipo",
            "Estado",
            "Cantidad",
            "Fecha",
            "Consumo",
          ]}
        >
          {records.map((record) => {
            const consumptionCost = record.consumptions.reduce(
              (sum, item) =>
                sum +
                decimalToNumber(item.quantity) *
                  decimalToNumber(item.product.purchasePrice),
              0,
            );

            return (
              <tr key={record.id}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {record.serviceType.name}
                </td>
                <td className="px-4 py-3">{serviceKindLabels[record.kind]}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={record.status === "CANCELLED" ? "error" : "info"}
                  >
                    {serviceStatusLabels[record.status]}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">{formatDecimal(record.quantity, 3)}</td>
                <td className="px-4 py-3">{formatDate(record.serviceDate)}</td>
                <td className="relative w-40 px-4 py-3">
                  {record.consumptions.length ? (
                    <details className="relative">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground [&::-webkit-details-marker]:hidden">
                        {formatCurrency(consumptionCost)}
                      </summary>
                      <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-card border border-border bg-surface p-2 shadow-md">
                        <ul className="space-y-1">
                          {record.consumptions.map((item) => (
                            <li className="text-xs text-foreground" key={item.id}>
                              <span className="font-medium">{item.product.name}</span>
                              <span className="text-muted-foreground">
                                {" "}— {formatDecimal(item.quantity, 0)} {item.product.unitName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState
          title="Sin servicios"
          description="Sin resultados para los filtros."
        />
      )}
      <PaginationBar {...meta} />
    </Section>
  );
}
