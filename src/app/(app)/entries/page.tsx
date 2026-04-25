import { PackageCheck, Plus } from "lucide-react";
import { Suspense } from "react";

import {
  EmptyState,
  FlashMessage,
  OperationalPageSkeleton,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  stockEntryStatusLabels,
} from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createStockEntry, receiveStockEntry } from "@/server/actions";

type EntriesPageProps = {
  searchParams: Promise<{
    success?: string;
  }>;
};

export default function EntriesPage({ searchParams }: EntriesPageProps) {
  return (
    <div>
      <PageHeader
        title="Entradas"
        description="Ordenes y compras recibidas. Recibir una orden actualiza el stock una sola vez."
      />
      <Suspense fallback={<OperationalPageSkeleton />}>
        <EntriesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EntriesContent({ searchParams }: EntriesPageProps) {
  await requireActiveUser("/entries");
  const params = await searchParams;
  const [suppliers, products, entries] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 200,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitName: true },
      take: 300,
    }),
    prisma.stockEntry.findMany({
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
      take: 50,
    }),
  ]);

  return (
    <>
      {params.success ? (
        <FlashMessage type="success">Entrada registrada correctamente.</FlashMessage>
      ) : null}

      <Section className="mb-5">
        <SectionHeader title="Nueva entrada" />
        <form action={createStockEntry} className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Proveedor</span>
              <select className="input" name="supplierId" required>
                <option value="">Seleccionar</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <select className="input" name="status" defaultValue="ORDERED">
                <option value="ORDERED">Ordenada</option>
                <option value="RECEIVED">Recibida</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Referencia</span>
              <input className="input" name="referenceNumber" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="table-operational">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Costo unit.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <select className="input" name="productId">
                        <option value="">Seleccionar</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.unitName})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input className="input" min="0.001" name="quantity" step="0.001" type="number" />
                    </td>
                    <td className="px-3 py-2">
                      <input className="input" min="0" name="unitCost" step="0.01" type="number" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Notas</span>
            <textarea className="input min-h-20 py-2" name="notes" />
          </label>

          <SubmitButton>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Registrar entrada
          </SubmitButton>
        </form>
      </Section>

      <Section>
        <SectionHeader title="Entradas recientes" />
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => {
                  const total = entry.items.reduce(
                    (sum, item) =>
                      sum +
                      decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
                    0,
                  );

                  return (
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
                        <StatusBadge
                          tone={entry.status === "RECEIVED" ? "success" : "info"}
                        >
                          {stockEntryStatusLabels[entry.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <p>{formatDate(entry.orderedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          Recibida: {formatDate(entry.receivedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-primary">
                            {entry.items.length} items
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {entry.items.map((item) => (
                              <li key={item.id}>
                                {item.product.name}: {formatDecimal(item.quantity, 3)} x{" "}
                                {formatCurrency(item.unitCost)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        {entry.status === "ORDERED" ? (
                          <form action={receiveStockEntry}>
                            <input name="id" type="hidden" value={entry.id} />
                            <SubmitButton className="btn btn-secondary">
                              <PackageCheck aria-hidden="true" className="h-4 w-4" />
                              Recibir
                            </SubmitButton>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Aplicada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin entradas" description="Registra la primera compra u orden." />
        )}
      </Section>
    </>
  );
}
