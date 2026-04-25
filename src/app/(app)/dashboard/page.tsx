import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  PackagePlus,
  ReceiptText,
  Send,
  Settings2,
  WalletCards,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { DashboardContentSkeleton, StatusBadge } from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  movementTypeLabels,
} from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
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
      where: { isActive: true },
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
    prisma.product.count({ where: { currentStock: 0, isActive: true } }),
    prisma.stockEntry.count({ where: { createdAt: { gte: today } } }),
    prisma.stockOutput.count({ where: { occurredAt: { gte: today } } }),
    prisma.serviceRecord.count({ where: { serviceDate: { gte: today } } }),
    prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, unitName: true } },
        performedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
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
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary-300 bg-secondary-50 px-4 py-1.5 text-sm font-medium text-success">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          {user.role === "ADMIN" ? "Admin" : "Usuario"} Online
        </span>
        <div className="flex flex-wrap gap-4">
          <Link className="btn btn-primary h-14 rounded-card px-8 text-base" href="/entries">
            <PackagePlus aria-hidden="true" className="h-6 w-6" />
            Entrada
          </Link>
          <Link
            className="btn h-14 rounded-card bg-success px-8 text-base text-success-foreground hover:bg-secondary-700"
            href="/outputs"
          >
            <Send aria-hidden="true" className="h-6 w-6" />
            Salida
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/stock?status=low"
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Bajo stock"
          tone="error"
          value={lowStockProducts.length}
        />
        <MetricCard
          href="/stock?status=out"
          icon={<Boxes className="h-5 w-5" />}
          label="Sin stock"
          tone="muted"
          value={outOfStockCount}
        />
        <MetricCard
          href="/entries"
          icon={<ClipboardList className="h-5 w-5" />}
          label="Entradas de hoy"
          tone="success"
          value={entriesToday}
        />
        <MetricCard
          href="/outputs"
          icon={<Send className="h-5 w-5" />}
          label="Salidas de hoy"
          tone="accent"
          value={outputsToday}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[2fr_0.95fr]">
        <div className="min-h-[440px] rounded-card border border-border bg-surface-elevated p-10 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-primary text-primary-foreground">
              <WalletCards aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-semibold text-foreground">
              Resumen Financiero
            </h2>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <FinanceMetric
              label="Valor inventario"
              tone="primary"
              value={formatCurrency(inventoryValue)}
            />
            <FinanceMetric label="Ventas de hoy" value={formatCurrency(salesRevenue)} />
            <FinanceMetric
              label="Utilidad bruta hoy"
              tone="success"
              value={formatCurrency(salesRevenue - salesCost)}
            />
          </div>
        </div>

        <div className="grid gap-8">
          <div className="min-h-[275px] rounded-card border border-border bg-surface-elevated p-8 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-foreground">Movimientos</h2>
              <ChevronRight aria-hidden="true" className="h-5 w-5 text-primary" />
            </div>
            {recentMovements.length ? (
              <div className="mt-6 space-y-4">
                {recentMovements.map((movement) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-muted px-4 py-3"
                    key={movement.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {movement.product.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {movementTypeLabels[movement.movementType]} -{" "}
                        {formatDate(movement.occurredAt)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={movement.direction === "IN" ? "success" : "warning"}
                    >
                      {formatDecimal(movement.quantity, 3)}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ReceiptText aria-hidden="true" className="h-7 w-7" />
                </span>
                <p className="mt-5 text-base text-muted-foreground">
                  Sin movimientos recientes
                </p>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-card border border-secondary-300 bg-surface-elevated p-8 shadow-soft">
            <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-secondary-50" />
            <h2 className="relative text-2xl font-semibold text-foreground">
              Atencion de Stock
            </h2>
            {lowStockProducts.length ? (
              <div className="relative mt-5 space-y-3">
                {lowStockProducts.slice(0, 3).map((product) => (
                  <div className="flex items-center justify-between gap-3" key={product.id}>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <StatusBadge
                      tone={
                        decimalToNumber(product.currentStock) <= 0 ? "error" : "warning"
                      }
                    >
                      {formatDecimal(product.currentStock, 3)}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative mt-5 flex items-center gap-4 text-success">
                <CheckCircle2 aria-hidden="true" className="h-7 w-7 fill-success" />
                <p className="text-xl font-medium">Stock saludable</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <ShortcutCard
          href="/services"
          icon={<Settings2 className="h-6 w-6" />}
          label={`Servicios hoy: ${servicesToday}`}
        />
        <ShortcutCard
          href="/products"
          icon={<BookOpen className="h-6 w-6" />}
          label="Catalogo de productos"
        />
        {user.role === "ADMIN" ? (
          <ShortcutCard
            href="/reports"
            icon={<BarChart3 className="h-6 w-6" />}
            label="Reportes administrativos"
          />
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
  tone: "success" | "error" | "muted" | "accent";
}) {
  const toneClass = {
    accent: {
      border: "border-l-accent-800",
      icon: "bg-accent-100 text-accent-800",
    },
    error: {
      border: "border-l-error",
      icon: "bg-error-surface text-error",
    },
    muted: {
      border: "border-l-muted-foreground",
      icon: "bg-muted text-muted-foreground",
    },
    success: {
      border: "border-l-success",
      icon: "bg-secondary-100 text-success",
    },
  }[tone];

  return (
    <Link
      className={cn(
        "min-h-[188px] rounded-card border border-l-[6px] border-border bg-surface-elevated p-7 shadow-soft transition hover:border-primary-200",
        toneClass.border,
      )}
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium uppercase tracking-widest text-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex h-14 w-11 items-center justify-center rounded-card",
            toneClass.icon,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-7 text-4xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </Link>
  );
}

function FinanceMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
}) {
  return (
    <div className="rounded-card border border-border bg-surface-muted p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight",
          tone === "primary"
            ? "text-primary"
            : tone === "success"
              ? "text-success"
              : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ShortcutCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      className="flex min-h-20 items-center justify-between gap-4 rounded-card border border-border bg-surface-elevated px-5 shadow-soft transition hover:border-primary-200 hover:bg-primary-50"
      href={href}
    >
      <span className="flex items-center gap-4 text-lg font-medium text-foreground">
        <span className="flex h-12 w-12 items-center justify-center rounded-card bg-primary-100 text-primary">
          {icon}
        </span>
        {label}
      </span>
      <ChevronRight aria-hidden="true" className="h-6 w-6 text-foreground" />
    </Link>
  );
}
