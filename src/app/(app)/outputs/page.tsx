import {
  EmptyState,
  FlashMessage,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import { OutputForm } from "@/components/outputs/output-form";
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

export default async function OutputsPage({ searchParams }: OutputsPageProps) {
  await requireActiveUser("/outputs");
  const params = await searchParams;
  const [products, outputs] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
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
            product: { select: { name: true, unitName: true } },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Salidas"
        description="Ventas, mermas y uso interno con validacion de stock en el servidor."
      />

      {params.success ? (
        <FlashMessage type="success">Salida registrada correctamente.</FlashMessage>
      ) : null}
      {params.error === "stock" ? (
        <FlashMessage type="error">Stock insuficiente para completar la salida.</FlashMessage>
      ) : null}

      <Section className="mb-5">
        <SectionHeader title="Nueva salida" />
        <OutputForm
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            unitName: product.unitName,
            currentStock: formatDecimal(product.currentStock, 3),
            salePrice: product.salePrice ? formatDecimal(product.salePrice, 2) : null,
          }))}
        />
      </Section>

      <Section>
        <SectionHeader title="Salidas recientes" />
        {outputs.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
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
                  const cost = output.items.reduce(
                    (sum, item) =>
                      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
                    0,
                  );
                  const revenue = output.items.reduce(
                    (sum, item) =>
                      sum +
                      decimalToNumber(item.quantity) *
                        decimalToNumber(item.unitSalePrice),
                    0,
                  );

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
                        <details>
                          <summary className="cursor-pointer text-primary">
                            {output.items.length} items
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {output.items.map((item) => (
                              <li key={item.id}>
                                {item.product.name}: {formatDecimal(item.quantity, 3)}{" "}
                                {item.product.unitName}
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
          <EmptyState title="Sin salidas" description="Registra una venta, merma o uso interno." />
        )}
      </Section>
    </div>
  );
}
