import { PackageCheck, Plus } from "lucide-react";
import { Suspense } from "react";

import {
  DateRangeFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters";
import {
  EmptyState,
  FlashMessage,
  PageHeader,
  Section,
  StatusBadge,
  SubmitButton,
  TableSkeleton,
} from "@/components/shared";
import { FormModal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
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
import type { StockEntryStatus } from "../../../../prisma/generated/client";

type EntriesSearchParams = {
  success?: string;
  q?: string;
  from?: string;
  to?: string;
  status?: StockEntryStatus;
  supplierId?: string;
};

type EntriesPageProps = {
  searchParams: Promise<EntriesSearchParams>;
};

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  await requireActiveUser("/entries");
  const params = await searchParams;
  const [suppliers, products] = await Promise.all([
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
  ]);

  const supplierOptions = suppliers.map((supplier) => ({
    label: supplier.name,
    value: supplier.id,
  }));

  const filterKey = JSON.stringify({
    from: params.from ?? "",
    q: params.q ?? "",
    status: params.status ?? "",
    supplierId: params.supplierId ?? "",
    to: params.to ?? "",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        action={
          <FormModal
            size="xl"
            title="Nueva entrada"
            description="Registra una orden o recepcion de mercaderia."
            trigger={
              <>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva entrada
              </>
            }
          >
            <form action={createStockEntry} className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Proveedor
                  </span>
                  <Select name="supplierId" required>
                    <option value="">Seleccionar</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Estado
                  </span>
                  <Select defaultValue="ORDERED" name="status">
                    <option value="ORDERED">Ordenada</option>
                    <option value="RECEIVED">Recibida</option>
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Referencia
                  </span>
                  <input className="input" name="referenceNumber" />
                </label>
              </div>

              <div className="overflow-x-auto rounded-card border border-border">
                <table className="table-operational">
                  <thead className="table-operational-head">
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
                          <Select name="productId">
                            <option value="">Seleccionar</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.unitName})
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input"
                            min="0.001"
                            name="quantity"
                            step="0.001"
                            type="number"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input"
                            min="0"
                            name="unitCost"
                            step="0.01"
                            type="number"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Notas</span>
                <textarea className="input min-h-20 py-2" name="notes" />
              </label>

              <div className="flex justify-end">
                <SubmitButton>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Registrar entrada
                </SubmitButton>
              </div>
            </form>
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">Entrada registrada correctamente.</FlashMessage>
      ) : null}

      <FilterBar>
        <SearchFilter
          className="xl:col-span-2"
          label="Referencia"
          name="q"
          placeholder="Numero o codigo"
        />
        <SelectFilter
          allLabel="Todos"
          label="Estado"
          name="status"
          options={[
            { label: "Ordenada", value: "ORDERED" },
            { label: "Recibida", value: "RECEIVED" },
          ]}
        />
        <SelectFilter
          allLabel="Todos"
          label="Proveedor"
          name="supplierId"
          options={supplierOptions}
        />
        <DateRangeFilter
          className="md:col-span-2 xl:col-span-2"
          label="Periodo de orden"
        />
      </FilterBar>

      <Suspense
        fallback={<TableSkeleton columns={7} rows={6} />}
        key={filterKey}
      >
        <EntriesList searchParams={params} />
      </Suspense>
    </div>
  );
}

async function EntriesList({ searchParams }: { searchParams: EntriesSearchParams }) {
  const q = searchParams.q?.trim();
  const from = searchParams.from;
  const to = searchParams.to;
  const status = searchParams.status;
  const supplierId = searchParams.supplierId;

  const orderedAtFilter: Record<string, Date> = {};
  if (from) orderedAtFilter.gte = new Date(`${from}T00:00:00.000`);
  if (to) orderedAtFilter.lte = new Date(`${to}T23:59:59.999`);

  const entries = await prisma.stockEntry.findMany({
    where: {
      ...(Object.keys(orderedAtFilter).length ? { orderedAt: orderedAtFilter } : {}),
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(q
        ? { referenceNumber: { contains: q, mode: "insensitive" as const } }
        : {}),
    },
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
    take: 100,
  });

  return (
    <Section>
      {entries.length ? (
        <div className="overflow-x-auto">
          <table className="table-operational">
            <thead className="table-operational-head">
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
        <EmptyState title="Sin entradas" description="Sin resultados para los filtros." />
      )}
    </Section>
  );
}
