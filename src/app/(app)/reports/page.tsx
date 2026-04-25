import { Search } from "lucide-react";
import { Suspense } from "react";

import {
  EmptyState,
  PageContentSkeleton,
  PageHeader,
  ProductCategoryBadge,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatDecimal,
  movementDirectionLabels,
  movementTypeLabels,
  productCategoryLabels,
  serviceKindLabels,
  serviceStatusLabels,
  stockOutputReasonLabels,
} from "@/lib/format";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type {
  ProductCategory,
  ServiceKind,
  ServiceStatus,
  StockEntryStatus,
  StockMovementDirection,
  StockMovementType,
  StockOutputReason,
} from "../../../../prisma/generated/client";

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
type DecimalValue = Parameters<typeof formatDecimal>[0];

type ReportProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  currentStock: DecimalValue;
  minimumStock: DecimalValue;
  purchasePrice: DecimalValue;
};

type ReportSupplier = {
  id: string;
  name: string;
};

type MovementRow = {
  id: string;
  occurredAt: Date;
  direction: StockMovementDirection;
  movementType: StockMovementType;
  quantity: DecimalValue;
  unitCost: DecimalValue;
  product: {
    name: string;
    category: ProductCategory;
    unitName: string;
  };
};

type EntryRow = {
  id: string;
  orderedAt: Date;
  status: StockEntryStatus;
  supplier: {
    name: string;
  };
  items: {
    quantity: DecimalValue;
    unitCost: DecimalValue;
    product: {
      name: string;
      category: ProductCategory;
    };
  }[];
};

type OutputRow = {
  id: string;
  occurredAt: Date;
  reason: StockOutputReason;
  items: {
    quantity: DecimalValue;
    unitCost: DecimalValue;
    unitSalePrice: DecimalValue;
    product: {
      name: string;
      category: ProductCategory;
    };
  }[];
};

type ServiceRow = {
  id: string;
  serviceDate: Date;
  kind: ServiceKind;
  status: ServiceStatus;
  quantity: DecimalValue;
  serviceType: {
    name: string;
  };
  consumptions: {
    product: {
      name: string;
    };
  }[];
};

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00.000`);
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

export default function ReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportsContent({ searchParams }: ReportsPageProps) {
  await requireRole(["ADMIN"], "/reports");
  const params = await searchParams;
  const from = params.from ?? defaultFrom();
  const to = params.to ?? defaultTo();
  const start = startOfDate(from);
  const end = endOfDate(to);
  const category = params.category;
  const productId = params.productId || undefined;
  const supplierId = params.supplierId || undefined;

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
      },
      take: 500,
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 300,
    }),
  ]);

  const [movements, entries, outputs, services] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        occurredAt: { gte: start, lte: end },
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
        orderedAt: { gte: start, lte: end },
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
        occurredAt: { gte: start, lte: end },
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
        serviceDate: { gte: start, lte: end },
      },
      include: {
        serviceType: { select: { name: true } },
        consumptions: { include: { product: { select: { name: true } } } },
      },
      orderBy: { serviceDate: "desc" },
      take: 120,
    }),
  ]);

  const filteredProducts = products.filter(
    (product) => !category || product.category === category,
  );
  const lowStock = filteredProducts.filter(
    (product) =>
      decimalToNumber(product.currentStock) <= decimalToNumber(product.minimumStock),
  );
  const outOfStock = filteredProducts.filter(
    (product) => decimalToNumber(product.currentStock) <= 0,
  );
  const inventoryValue = filteredProducts.reduce(
    (sum, product) =>
      sum +
      decimalToNumber(product.currentStock) * decimalToNumber(product.purchasePrice),
    0,
  );
  const purchaseTotal = entries.reduce(
    (sum, entry) =>
      sum +
      entry.items.reduce(
        (entrySum, item) =>
          entrySum +
          decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
        0,
      ),
    0,
  );
  const saleItems = outputs.flatMap((output) =>
    output.reason === "SALE" ? output.items : [],
  );
  const saleRevenue = saleItems.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const saleCost = saleItems.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );
  const outputCost = outputs.reduce(
    (sum, output) =>
      sum +
      output.items.reduce(
        (outputSum, item) =>
          outputSum +
          decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
        0,
      ),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Analisis administrativo con datos historicos congelados en entradas, salidas y movimientos."
      />
      <ReportsTables
        category={category}
        entries={entries}
        from={from}
        inventoryValue={inventoryValue}
        lowStock={lowStock}
        movements={movements}
        outOfStock={outOfStock}
        outputCost={outputCost}
        outputs={outputs}
        productId={productId}
        products={products}
        purchaseTotal={purchaseTotal}
        saleCost={saleCost}
        saleRevenue={saleRevenue}
        services={services}
        supplierId={supplierId}
        suppliers={suppliers}
        to={to}
      />
    </div>
  );
}

function ReportsTables({
  category,
  entries,
  from,
  inventoryValue,
  lowStock,
  movements,
  outOfStock,
  outputCost,
  outputs,
  productId,
  products,
  purchaseTotal,
  saleCost,
  saleRevenue,
  services,
  supplierId,
  suppliers,
  to,
}: {
  category: ProductCategory | undefined;
  entries: EntryRow[];
  from: string;
  inventoryValue: number;
  lowStock: ReportProduct[];
  movements: MovementRow[];
  outOfStock: ReportProduct[];
  outputCost: number;
  outputs: OutputRow[];
  productId: string | undefined;
  products: ReportProduct[];
  purchaseTotal: number;
  saleCost: number;
  saleRevenue: number;
  services: ServiceRow[];
  supplierId: string | undefined;
  suppliers: ReportSupplier[];
  to: string;
}) {
  return (
    <>
      <Section className="mb-5">
        <SectionHeader title="Filtros" />
        <form className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-[140px_140px_180px_1fr_1fr_auto]" action="/reports">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Desde</span>
            <input className="input" defaultValue={from} name="from" type="date" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Hasta</span>
            <input className="input" defaultValue={to} name="to" type="date" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Categoria</span>
            <select className="input" defaultValue={category ?? ""} name="category">
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {productCategoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Producto</span>
            <select className="input" defaultValue={productId ?? ""} name="productId">
              <option value="">Todos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Proveedor</span>
            <select className="input" defaultValue={supplierId ?? ""} name="supplierId">
              <option value="">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              <Search aria-hidden="true" className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </form>
      </Section>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Valor inventario" value={formatCurrency(inventoryValue)} />
        <ReportMetric label="Compras periodo" value={formatCurrency(purchaseTotal)} />
        <ReportMetric label="Ingresos ventas" value={formatCurrency(saleRevenue)} />
        <ReportMetric label="Utilidad bruta" value={formatCurrency(saleRevenue - saleCost)} />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <ReportMetric label="Bajo stock" value={String(lowStock.length)} />
        <ReportMetric label="Sin stock" value={String(outOfStock.length)} />
        <ReportMetric label="Costo salidas" value={formatCurrency(outputCost)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section>
          <SectionHeader title="Movimientos por periodo" />
          {movements.length ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="table-operational">
                <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cant.</th>
                    <th className="px-4 py-3">Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3">{formatDate(movement.occurredAt)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">
                            {movement.product.name}
                          </p>
                          <ProductCategoryBadge
                            category={movement.product.category}
                            className="min-h-6 rounded-control px-2 py-0.5"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={movement.direction === "IN" ? "success" : "warning"}
                        >
                          {movementDirectionLabels[movement.direction]} -{" "}
                          {movementTypeLabels[movement.movementType]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimal(movement.quantity, 3)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(movement.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin movimientos" />
          )}
        </Section>

        <Section>
          <SectionHeader title="Stock bajo y sin stock" />
          {lowStock.length ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="table-operational">
                <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Minimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStock.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="px-4 py-3">
                        <ProductCategoryBadge category={product.category} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            decimalToNumber(product.currentStock) <= 0
                              ? "error"
                              : "warning"
                          }
                        >
                          {formatDecimal(product.currentStock, 3)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimal(product.minimumStock, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin alertas de stock" />
          )}
        </Section>

        <Section>
          <SectionHeader title="Compras por proveedor" />
          {entries.length ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="table-operational">
                <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">{formatDateOnly(entry.orderedAt)}</td>
                      <td className="px-4 py-3">{entry.supplier.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={entry.status === "RECEIVED" ? "success" : "info"}
                        >
                          {entry.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(
                          entry.items.reduce(
                            (sum, item) =>
                              sum +
                              decimalToNumber(item.quantity) *
                                decimalToNumber(item.unitCost),
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin compras" />
          )}
        </Section>

        <Section>
          <SectionHeader title="Salidas y utilidad" />
          {outputs.length ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="table-operational">
                <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Costo</th>
                    <th className="px-4 py-3">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outputs.map((output) => {
                    const cost = output.items.reduce(
                      (sum, item) =>
                        sum +
                        decimalToNumber(item.quantity) *
                          decimalToNumber(item.unitCost),
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
                        <td className="px-4 py-3">{formatDate(output.occurredAt)}</td>
                        <td className="px-4 py-3">
                          {stockOutputReasonLabels[output.reason]}
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
            <EmptyState title="Sin salidas" />
          )}
        </Section>
      </div>

      <Section className="mt-5">
        <SectionHeader title="Resumen de servicios" />
        {services.length ? (
          <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Consumos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-3">{formatDate(service.serviceDate)}</td>
                    <td className="px-4 py-3">{service.serviceType.name}</td>
                    <td className="px-4 py-3">{serviceKindLabels[service.kind]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={service.status === "CANCELLED" ? "error" : "info"}
                      >
                        {serviceStatusLabels[service.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">{formatDecimal(service.quantity, 3)}</td>
                    <td className="px-4 py-3">{service.consumptions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin servicios en el periodo" />
        )}
      </Section>
    </>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
