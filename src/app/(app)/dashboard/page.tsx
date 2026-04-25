import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Send } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState, PageHeader, Section, SectionHeader, StatusBadge } from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  movementTypeLabels,
} from "@/lib/format";
import prisma from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function DashboardPage() {
  const user = await requireActiveUser("/dashboard");
  const today = startOfToday();

  const [
    products,
    outOfStockCount,
    entriesToday,
    outputsToday,
    servicesToday,
    recentMovements,
    saleItemsToday,
  ] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.product.count({ where: { currentStock: 0 } }),
    prisma.stockEntry.count({ where: { createdAt: { gte: today } } }),
    prisma.stockOutput.count({ where: { occurredAt: { gte: today } } }),
    prisma.serviceRecord.count({ where: { serviceDate: { gte: today } } }),
    prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, unitName: true } },
        performedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 8,
    }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: "SALE",
          occurredAt: { gte: today },
        },
      },
      select: {
        quantity: true,
        unitCost: true,
        unitSalePrice: true,
      },
    }),
  ]);

  const lowStockProducts = products.filter(
    (product) =>
      decimalToNumber(product.currentStock) <= decimalToNumber(product.minimumStock),
  );
  const inventoryValue = products.reduce(
    (sum, product) =>
      sum +
      decimalToNumber(product.currentStock) * decimalToNumber(product.purchasePrice),
    0,
  );
  const salesRevenue = saleItemsToday.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const salesCost = saleItemsToday.reduce(
    (sum, item) => sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );

  return (
    <div>
      <PageHeader
        title={`Hola, ${user.firstName}`}
        description="Resumen operativo del inventario y accesos rapidos para el trabajo diario."
        action={
          <>
            <Link className="btn btn-primary" href="/entries">
              <PackagePlus aria-hidden="true" className="h-4 w-4" />
              Entrada
            </Link>
            <Link className="btn btn-accent" href="/outputs">
              <Send aria-hidden="true" className="h-4 w-4" />
              Salida
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/stock?status=low"
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Bajo stock"
          tone="warning"
          value={lowStockProducts.length}
        />
        <MetricCard
          href="/stock?status=out"
          icon={<Boxes className="h-5 w-5" />}
          label="Sin stock"
          tone="error"
          value={outOfStockCount}
        />
        <MetricCard
          href="/entries"
          icon={<ClipboardList className="h-5 w-5" />}
          label="Entradas de hoy"
          tone="info"
          value={entriesToday}
        />
        <MetricCard
          href="/outputs"
          icon={<Send className="h-5 w-5" />}
          label="Salidas de hoy"
          tone="success"
          value={outputsToday}
        />
      </div>

      {user.role === "ADMIN" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <AdminMetric label="Valor inventario" value={formatCurrency(inventoryValue)} />
          <AdminMetric label="Ventas de hoy" value={formatCurrency(salesRevenue)} />
          <AdminMetric
            label="Utilidad bruta hoy"
            value={formatCurrency(salesRevenue - salesCost)}
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Section>
          <SectionHeader title="Movimientos recientes" />
          {recentMovements.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {movement.product.name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={movement.direction === "IN" ? "success" : "warning"}
                        >
                          {movementTypeLabels[movement.movementType]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimal(movement.quantity, 3)}{" "}
                        {movement.product.unitName}
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimal(movement.productStockAfter, 3)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(movement.occurredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin movimientos" description="Aun no hay actividad registrada." />
          )}
        </Section>

        <Section>
          <SectionHeader title="Atencion de stock" />
          {lowStockProducts.length ? (
            <div className="divide-y divide-border">
              {lowStockProducts.slice(0, 8).map((product) => (
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  key={product.id}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Minimo {formatDecimal(product.minimumStock, 3)}
                    </p>
                  </div>
                  <StatusBadge
                    tone={decimalToNumber(product.currentStock) <= 0 ? "error" : "warning"}
                  >
                    {formatDecimal(product.currentStock, 3)}
                  </StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Stock saludable"
              description="No hay productos por debajo del minimo."
            />
          )}
        </Section>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Link className="btn btn-secondary justify-start" href="/services">
          Servicios hoy: {servicesToday}
        </Link>
        <Link className="btn btn-ghost justify-start border border-border" href="/products">
          Catalogo de productos
        </Link>
        {user.role === "ADMIN" ? (
          <Link className="btn btn-ghost justify-start border border-border" href="/reports">
            Reportes administrativos
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({
  href,
  icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: number;
  tone: "success" | "warning" | "error" | "info";
}) {
  return (
    <Link
      className="rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary"
      href={href}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      <p className="mt-4 text-3xl font-semibold text-foreground">{value}</p>
    </Link>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
