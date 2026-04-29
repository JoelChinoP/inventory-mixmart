import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  PackagePlus,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { RangeSelector } from "@/components/dashboard/range-selector";
import { DashboardContentSkeleton } from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  movementTypeLabels,
} from "@/lib/format";
import { formatRelativeTime, getRange } from "@/lib/date-range";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  await requireActiveUser("/dashboard");
  const params = await searchParams;
  const range = getRange(params.range);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    products,
    activeProductsCount,
    categoryGroups,
    entriesToday,
    outputsToday,
    saleItemsRange,
    saleItemsPrevious,
    recentMovements,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
    }),
    prisma.stockEntry.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.stockOutput.count({ where: { occurredAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: "SALE",
          occurredAt: { gte: range.start, lte: range.end },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: "SALE",
          occurredAt: { gte: range.previousStart, lte: range.previousEnd },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
    prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, unitName: true, sku: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  const lowStockProducts = products.filter((product) => {
    const stock = decimalToNumber(product.currentStock);
    const minimum = decimalToNumber(product.minimumStock);
    return stock <= minimum;
  });
  const outOfStockProducts = lowStockProducts.filter(
    (product) => decimalToNumber(product.currentStock) <= 0,
  );
  const lowStockOnly = lowStockProducts.filter(
    (product) => decimalToNumber(product.currentStock) > 0,
  );
  const inventoryCost = products.reduce(
    (sum, product) =>
      sum +
      decimalToNumber(product.currentStock) * decimalToNumber(product.purchasePrice),
    0,
  );
  const revenue = saleItemsRange.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const cogs = saleItemsRange.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );
  const previousRevenue = saleItemsPrevious.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const revenueChange =
    previousRevenue > 0
      ? ((revenue - previousRevenue) / previousRevenue) * 100
      : revenue > 0
        ? 100
        : 0;

  const attentionList = [
    ...outOfStockProducts.map((product) => ({ product, status: "out" as const })),
    ...lowStockOnly.map((product) => ({ product, status: "low" as const })),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          delta={null}
          icon={<ArrowDownLeft className="h-5 w-5" />}
          label="Entradas de hoy"
          subtitle="unidades"
          tone="entry"
          value={entriesToday}
        />
        <MetricCard
          delta={null}
          icon={<ArrowUpRight className="h-5 w-5" />}
          label="Salidas de hoy"
          subtitle="unidades"
          tone="output"
          value={outputsToday}
        />
        <MetricCard
          delta={null}
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Bajo stock"
          subtitle={`${outOfStockProducts.length} sin stock`}
          tone="warning"
          value={lowStockProducts.length}
        />
        <MetricCard
          delta={null}
          icon={<Boxes className="h-5 w-5" />}
          label="Productos activos"
          subtitle={`SKUs · ${categoryGroups.length} categorias`}
          tone="muted"
          value={activeProductsCount}
        />
      </div>

      <section className="card-ink relative overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-foreground sm:text-2xl">
              Resumen financiero
            </h2>
            <p className="mt-1 text-sm text-ink-foreground/60">
              {range.label} · {range.detail}
            </p>
          </div>
          <RangeSelector value={range.key} />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:items-end">
          <FinanceMain
            change={revenueChange}
            label="Ingresos"
            value={formatCurrency(revenue)}
          />
          <FinanceSecondary
            label="Costo de inventario"
            note="Valorizacion al cierre"
            value={formatCurrency(inventoryCost)}
          />
          <FinanceSecondary
            highlight
            label="Margen bruto"
            note={`${margin.toFixed(1)}% sobre ingresos`}
            value={formatCurrency(grossProfit)}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-card border border-border bg-surface-elevated p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Movimientos recientes
            </h2>
            <Link
              className="text-sm font-medium text-primary hover:underline"
              href="/stock"
            >
              Ver todos
            </Link>
          </div>
          {recentMovements.length ? (
            <ul className="mt-5 space-y-3">
              {recentMovements.map((movement) => {
                const direction = movement.direction;
                return (
                  <li
                    className="flex items-center justify-between gap-4 rounded-card px-3 py-3 transition hover:bg-surface-muted"
                    key={movement.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          direction === "IN"
                            ? "bg-accent-100 text-accent-700"
                            : "bg-secondary-100 text-secondary-700",
                        )}
                      >
                        {direction === "IN" ? (
                          <ArrowDownLeft aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {movement.product.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {movementTypeLabels[movement.movementType]}
                          {movement.product.sku ? ` · ${movement.product.sku}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          direction === "IN" ? "text-accent-700" : "text-secondary-700",
                        )}
                      >
                        {direction === "IN" ? "+" : "-"}
                        {Math.round(decimalToNumber(movement.quantity))}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(movement.occurredAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Sin movimientos recientes.
            </p>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface-elevated p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">Atencion</h2>
            <Link
              className="text-sm font-medium text-primary hover:underline"
              href="/stock?status=low"
            >
              Ver stock
            </Link>
          </div>
          {attentionList.length ? (
            <ul className="mt-5 space-y-2.5">
              {attentionList.map(({ product, status }) => {
                const isOut = status === "out";
                return (
                  <li
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-card border px-3.5 py-3",
                      isOut
                        ? "border-error-border bg-error/15 text-error"
                        : "border-warning-border bg-warning-surface",
                    )}
                    key={product.id}
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          isOut ? "text-error" : "text-foreground",
                        )}
                      >
                        {product.name}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-xs",
                          isOut ? "text-error/80" : "text-muted-foreground",
                        )}
                      >
                        {product.sku ?? "Sin SKU"} · Minimo{" "}
                        {Math.round(decimalToNumber(product.minimumStock))}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-control px-2.5 py-1 text-xs font-semibold",
                        isOut
                          ? "bg-error text-error-foreground"
                          : "bg-warning text-warning-foreground",
                      )}
                    >
                      {isOut
                        ? "SIN STOCK"
                        : `${Math.round(decimalToNumber(product.currentStock))} / ${Math.round(decimalToNumber(product.minimumStock))} uds`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Todo el stock esta dentro de los minimos.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ShortcutCard
          description="Recibir mercaderia de un proveedor"
          href="/entries"
          icon={<ArrowDownLeft className="h-5 w-5" />}
          title="Registrar entrada"
        />
        <ShortcutCard
          description="Venta, merma o uso interno"
          href="/outputs"
          icon={<ArrowUpRight className="h-5 w-5" />}
          title="Registrar salida"
        />
        <ShortcutCard
          description="Agregar al catalogo"
          href="/products"
          icon={<PackagePlus className="h-5 w-5" />}
          title="Nuevo producto"
        />
        <ShortcutCard
          description="Ingresos, mermas, top vendidos"
          href="/reports"
          icon={<BarChart3 className="h-5 w-5" />}
          title="Reportes del mes"
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  tone: "entry" | "output" | "warning" | "muted";
  delta: number | null;
}) {
  const toneClass = {
    entry: "bg-accent-100 text-accent-700",
    output: "bg-secondary-100 text-secondary-700",
    warning: "bg-warning-surface text-warning",
    muted: "bg-primary-50 text-primary-700",
  }[tone];

  return (
    <div className="rounded-card border border-border bg-surface-elevated p-5 transition hover:border-primary-200">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            toneClass,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-5 text-4xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

function FinanceMain({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number;
}) {
  const positive = change >= 0;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-foreground/60">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-ink-foreground sm:text-5xl">
        {value}
      </p>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-sm font-medium",
          positive ? "text-accent-300" : "text-secondary-300",
        )}
      >
        {positive ? "+" : ""}
        {change.toFixed(1)}%
        <span className="text-ink-foreground/55">vs. periodo anterior</span>
      </p>
    </div>
  );
}

function FinanceSecondary({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-foreground/60">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
          highlight ? "text-accent-300" : "text-ink-foreground",
        )}
      >
        {value}
      </p>
      {note ? (
        <p className="mt-1.5 text-xs text-ink-foreground/55">{note}</p>
      ) : null}
    </div>
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      className="group flex flex-col gap-2 rounded-card border border-border bg-surface-elevated p-5 transition hover:border-primary-200 hover:bg-primary-50/35"
      href={href}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </span>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
