import {
  BriefcaseBusiness,
  CircleAlert,
  ListFilter,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Suspense } from "react";

import {
  EmptyState,
  FlashMessage,
  OperationalPageSkeleton,
  PageHeader,
  ProductCategoryBadge,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import { OutputForm } from "@/components/outputs/output-form";
import { FormModal } from "@/components/ui/modal";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  stockOutputReasonLabels,
} from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type OutputsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default function OutputsPage({ searchParams }: OutputsPageProps) {
  return (
    <div>
      <Suspense fallback={<OperationalPageSkeleton />}>
        <OutputsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OutputsContent({ searchParams }: OutputsPageProps) {
  await requireActiveUser("/outputs");
  const params = await searchParams;
  const [products, outputs] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        unitName: true,
        currentStock: true,
        salePrice: true,
      },
      take: 300,
    }),
    prisma.stockOutput.findMany({
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { name: true, unitName: true, category: true } },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);
  const outputSummary = outputs.reduce(
    (summary, output) => {
      const totals = getOutputTotals(output);

      return {
        cost: summary.cost + totals.cost,
        items: summary.items + output.items.length,
        revenue: summary.revenue + totals.revenue,
      };
    },
    { cost: 0, items: 0, revenue: 0 },
  );

  return (
    <>
      <PageHeader
        title="Salidas"
        description="Ventas, mermas y uso interno con validacion de stock en el servidor."
        action={
          <FormModal
            size="xl"
            title="Nueva salida"
            description="Registra ventas, mermas o uso interno."
            trigger={
              <>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva salida
              </>
            }
          >
            <OutputForm
              products={products.map((product) => ({
                id: product.id,
                name: product.name,
                category: product.category,
                unitName: product.unitName,
                currentStock: formatDecimal(product.currentStock, 3),
                salePrice: product.salePrice ? formatDecimal(product.salePrice, 2) : null,
              }))}
            />
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">Salida registrada correctamente.</FlashMessage>
      ) : null}
      {params.error === "stock" ? (
        <FlashMessage type="error">Stock insuficiente para completar la salida.</FlashMessage>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Section>
          <SectionHeader title="Historial completo" />
          {outputs.length ? (
            <div className="overflow-x-auto">
              <table className="table-operational">
                <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Creado por</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Costo</th>
                    <th className="px-4 py-3">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outputs.map((output) => {
                    const { cost, revenue } = getOutputTotals(output);

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
                        <td className="px-4 py-3">
                          <details className="[&_summary::-webkit-details-marker]:hidden">
                            <summary className="inline-flex cursor-pointer list-none items-center rounded-control border border-primary-200 bg-primary-50 px-2 py-1 text-primary">
                              {output.items.length} items
                            </summary>
                            <ul className="popover-window mt-2 space-y-2">
                              {output.items.map((item) => (
                                <li
                                  className="flex flex-wrap items-center gap-2"
                                  key={item.id}
                                >
                                  <span>
                                    {item.product.name}:{" "}
                                    {formatDecimal(item.quantity, 3)}{" "}
                                    {item.product.unitName}
                                  </span>
                                  <ProductCategoryBadge
                                    category={item.product.category}
                                    className="min-h-6 rounded-control px-2 py-0.5"
                                  />
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td className="px-4 py-3">{formatCurrency(cost)}</td>
                        <td className="px-4 py-3">
                          {output.reason === "SALE" ? formatCurrency(revenue) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin salidas"
              description="Registra una venta, merma o uso interno."
            />
          )}
        </Section>

        <aside className="space-y-5">
          <Section>
            <SectionHeader title="Resumen rapido" />
            <div className="space-y-3 p-4">
              <SummaryRow label="Salidas visibles" value={String(outputs.length)} />
              <SummaryRow label="Items retirados" value={String(outputSummary.items)} />
              <SummaryRow
                label="Ingreso ventas"
                value={formatCurrency(outputSummary.revenue)}
              />
              <SummaryRow
                label="Costo salidas"
                value={formatCurrency(outputSummary.cost)}
              />
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
                description="Registra una venta, merma o uso interno."
              />
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}

function getOutputTotals(output: {
  items: {
    quantity: unknown;
    unitCost: unknown;
    unitSalePrice: unknown;
  }[];
}) {
  const cost = output.items.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity as never) *
        decimalToNumber(item.unitCost as never),
    0,
  );
  const revenue = output.items.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity as never) *
        decimalToNumber(item.unitSalePrice as never),
    0,
  );

  return { cost, revenue };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-muted px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function RecentOutputItem({
  output,
}: {
  output: {
    id: string;
    reason: "SALE" | "WASTE" | "INTERNAL_USE";
    occurredAt: Date;
    items: {
      id: string;
      quantity: unknown;
      unitCost: unknown;
      unitSalePrice: unknown;
      product: {
        name: string;
        unitName: string;
        category: Parameters<typeof ProductCategoryBadge>[0]["category"];
      };
    }[];
  };
}) {
  const { revenue } = getOutputTotals(output);
  const Icon =
    output.reason === "SALE"
      ? ShoppingCart
      : output.reason === "WASTE"
        ? CircleAlert
        : BriefcaseBusiness;

  return (
    <details className="group px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-primary-100 bg-primary-50 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {stockOutputReasonLabels[output.reason]}
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {output.reason === "SALE" ? formatCurrency(revenue) : "-"}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatDate(output.occurredAt)} - {output.items.length} items
          </span>
        </span>
      </summary>
      <div className="popover-window mt-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ListFilter aria-hidden="true" className="h-3.5 w-3.5" />
          Detalle
        </div>
        <div className="space-y-2">
          {output.items.map((item) => (
            <div
              className="rounded-control border border-border bg-surface px-2 py-2"
              key={item.id}
            >
              <p className="text-sm font-medium text-foreground">
                {item.product.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDecimal(item.quantity as never, 3)} {item.product.unitName}
                </span>
                <ProductCategoryBadge
                  category={item.product.category}
                  className="min-h-6 rounded-control px-2 py-0.5"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
