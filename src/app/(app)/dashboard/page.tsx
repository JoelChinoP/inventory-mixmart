import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Receipt,
  Search,
  Settings2,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { Suspense, type ReactNode } from 'react';

import { RangeSelector } from '@/components/dashboard/range-selector';
import { DashboardContentSkeleton } from '@/components/shared';
import { decimalToNumber, formatCurrency } from '@/lib/format';
import { formatRelativeTime, getRange } from '@/lib/date-range';
import { requireActiveUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cn } from '@/lib/utils';
import type {
  StockMovementDirection,
  StockMovementType,
} from '../../../../prisma/generated/client';

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
  const user = await requireActiveUser('/dashboard');
  const params = await searchParams;
  const range = getRange(params.range);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    products,
    entriesToday,
    outputsToday,
    salesToday,
    wasteToday,
    servicesToday,
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
      orderBy: { name: 'asc' },
      take: 500,
    }),
    prisma.stockEntry.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.stockOutput.count({
      where: { occurredAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.stockOutput.count({
      where: {
        occurredAt: { gte: todayStart, lte: todayEnd },
        reason: 'SALE',
      },
    }),
    prisma.stockOutput.count({
      where: {
        occurredAt: { gte: todayStart, lte: todayEnd },
        reason: 'WASTE',
      },
    }),
    prisma.serviceRecord.count({
      where: { serviceDate: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: 'SALE',
          occurredAt: { gte: range.start, lte: range.end },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
    prisma.stockOutputItem.findMany({
      where: {
        stockOutput: {
          reason: 'SALE',
          occurredAt: { gte: range.previousStart, lte: range.previousEnd },
        },
      },
      select: { quantity: true, unitCost: true, unitSalePrice: true },
    }),
    prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        performedBy: { select: { firstName: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 6,
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
      decimalToNumber(product.currentStock) *
        decimalToNumber(product.purchasePrice),
    0,
  );
  const revenue = saleItemsRange.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const cogs = saleItemsRange.reduce(
    (sum, item) =>
      sum + decimalToNumber(item.quantity) * decimalToNumber(item.unitCost),
    0,
  );
  const previousRevenue = saleItemsPrevious.reduce(
    (sum, item) =>
      sum +
      decimalToNumber(item.quantity) * decimalToNumber(item.unitSalePrice),
    0,
  );
  const grossProfit = revenue - cogs;
  const revenueChange =
    previousRevenue > 0
      ? ((revenue - previousRevenue) / previousRevenue) * 100
      : revenue > 0
        ? 100
        : 0;

  const attentionList = [
    ...outOfStockProducts.map((product) => ({
      product,
      status: 'out' as const,
    })),
    ...lowStockOnly.map((product) => ({ product, status: 'low' as const })),
  ].slice(0, 4);

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="space-y-3.5 pb-12">
      <QuickActions isAdmin={isAdmin} />

      {isAdmin ? (
        <AdminHero
          rangeKey={range.key}
          rangeDetail={range.detail}
          rangeLabel={range.label}
          revenue={revenue}
          revenueChange={revenueChange}
          inventoryCost={inventoryCost}
          grossProfit={grossProfit}
          entriesToday={entriesToday}
          outputsToday={outputsToday}
          salesToday={salesToday}
          outOfStockCount={outOfStockProducts.length}
        />
      ) : (
        <WorkerHero
          entriesToday={entriesToday}
          outputsToday={outputsToday}
          salesToday={salesToday}
          wasteToday={wasteToday}
          servicesToday={servicesToday}
          outOfStockCount={outOfStockProducts.length}
          lowStockCount={lowStockOnly.length}
        />
      )}

      <div className="grid gap-3.5 xl:grid-cols-[2fr_1fr]">
        <RecentMovementsPanel
          movements={recentMovements}
          showOwnerFilter={!isAdmin}
        />
        <AttentionPanel
          items={attentionList}
          outOfStock={outOfStockProducts.length}
          lowStock={lowStockOnly.length}
        />
      </div>
    </div>
  );
}

/* ------------------------- Quick actions ------------------------- */

function QuickActions({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      <QuickAction
        href="/entries"
        title="Registrar entrada"
        description="Recibir mercaderia"
        icon={<ArrowDownLeft className="h-4 w-4" strokeWidth={2} />}
        tone="positive"
      />
      <QuickAction
        href="/outputs"
        title="Registrar salida"
        description="Venta, merma, uso"
        icon={<ArrowUpRight className="h-4 w-4" strokeWidth={2} />}
        tone="warning"
      />
      <QuickAction
        href="/services"
        title="Registrar servicio"
        description="Impresion, copia, etc"
        icon={<Settings2 className="h-4 w-4" strokeWidth={2} />}
        tone="service"
      />
      {isAdmin ? (
        <QuickAction
          href="/reports"
          title="Ver reportes"
          description="Ingresos, mermas, top"
          icon={<BarChart3 className="h-4 w-4" strokeWidth={2} />}
          tone="info"
        />
      ) : (
        <QuickAction
          href="/stock"
          title="Buscar producto"
          description="Verificar stock"
          icon={<Search className="h-4 w-4" strokeWidth={2} />}
          tone="brand"
        />
      )}
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'positive' | 'warning' | 'service' | 'info' | 'brand';
}) {
  const toneClass = {
    positive: 'bg-accent-100 text-accent-600',
    warning: 'bg-secondary-100 text-secondary-600',
    service: 'bg-oat-200 text-oat-700',
    info: 'bg-info-100 text-info-600',
    brand: 'bg-primary-100 text-primary',
  }[tone];

  return (
    <Link
      className="group flex items-center gap-3 rounded-[14px] border border-border bg-card p-3.5 transition hover:-translate-y-px hover:border-oat-400 hover:shadow-elevated"
      href={href}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
          toneClass,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13.5px] font-medium text-foreground">
          {title}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

/* ------------------------- Admin hero ------------------------- */

function AdminHero({
  rangeKey,
  rangeDetail,
  rangeLabel,
  revenue,
  revenueChange,
  inventoryCost,
  grossProfit,
  entriesToday,
  outputsToday,
  salesToday,
  outOfStockCount,
}: {
  rangeKey: ReturnType<typeof getRange>['key'];
  rangeDetail: string;
  rangeLabel: string;
  revenue: number;
  revenueChange: number;
  inventoryCost: number;
  grossProfit: number;
  entriesToday: number;
  outputsToday: number;
  salesToday: number;
  outOfStockCount: number;
}) {
  const positive = revenueChange >= 0;
  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    weekday: 'long',
  }).format(today);

  return (
    <div className="grid gap-3.5 xl:grid-cols-[3fr_1fr]">
      <section className="card-ink p-6 sm:p-7">
        <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-display text-[25px] font-medium tracking-tight">
            Resumen financiero
          </h2>
          <RangeSelector value={rangeKey} />
        </div>

        <div className="relative z-[1] mt-5 grid gap-7 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-foreground/50">
              Ingresos
            </p>
            <p className="mt-6 font-display text-[72px] font-medium leading-[1.05] tracking-tight text-ink-foreground">
              {formatCurrency(revenue)}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11.5px] text-ink-foreground/60">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium',
                  positive
                    ? 'bg-accent-300/22 text-accent-300'
                    : 'bg-danger-500/18 text-danger-300',
                )}
              >
                {positive ? (
                  <TrendingUp className="h-3 w-3" strokeWidth={2.4} />
                ) : (
                  <TrendingDown className="h-3 w-3" strokeWidth={2.4} />
                )}
                {positive ? '+' : ''}
                {revenueChange.toFixed(1)}%
              </span>
              <span>
                {rangeLabel.toLowerCase()} · {rangeDetail}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5 border-t border-white/8 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-foreground/50">
                Costo de inventario
              </p>
              <p className="mt-2 font-display text-[24px] font-medium tracking-tight text-ink-foreground/95">
                {formatCurrency(inventoryCost)}
              </p>
              <p className="mt-1 text-[11px] text-ink-foreground/55">
                Valorizacion al cierre
              </p>
            </div>
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-foreground/50">
                Margen bruto
              </p>
              <p className="mt-2 font-display text-[24px] font-medium tracking-tight text-accent-300">
                {formatCurrency(grossProfit)}
              </p>
              <p className="mt-1 text-[11px] text-ink-foreground/55">
                Total de ganancia bruta
              </p>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex flex-col rounded-card border border-border bg-card p-5">
        <h3 className="font-display text-[16px] font-medium">Hoy</h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground">{todayLabel}</p>
        <SnapshotRow
          label="Entradas"
          value={String(entriesToday)}
          dotClass="bg-accent-500"
        />
        <SnapshotRow
          label="Salidas"
          value={String(outputsToday)}
          dotClass="bg-secondary-500"
        />
        <SnapshotRow
          label="Ventas"
          value={String(salesToday)}
          dotClass="bg-primary"
          last
        />
        {outOfStockCount > 0 ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-[10px] bg-error-surface p-3">
            <span className="font-display text-[22px] font-medium leading-none text-error">
              {outOfStockCount}
            </span>
            <span className="text-[11.5px] font-medium leading-tight text-error">
              {outOfStockCount === 1
                ? 'Producto sin stock'
                : 'Productos sin stock'}
              <span className="mt-0.5 block text-[11px] font-normal text-error/75">
                requiere reposicion urgente
              </span>
            </span>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  dotClass,
  last = false,
}: {
  label: string;
  value: string;
  dotClass: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between py-2.5',
        last ? '' : 'border-b border-dashed border-border',
      )}
    >
      <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
        {label}
      </span>
      <span className="font-display text-[18px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

/* ------------------------- Worker hero ------------------------- */

function WorkerHero({
  entriesToday,
  outputsToday,
  salesToday,
  wasteToday,
  servicesToday,
  outOfStockCount,
  lowStockCount,
}: {
  entriesToday: number;
  outputsToday: number;
  salesToday: number;
  wasteToday: number;
  servicesToday: number;
  outOfStockCount: number;
  lowStockCount: number;
}) {
  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(today);

  return (
    <div className="grid gap-3.5 xl:grid-cols-[3fr_1fr]">
      <section className="rounded-card border border-border bg-card p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-[19px] font-medium tracking-tight text-foreground">
              Tu jornada
            </h2>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Hoy &middot; {todayLabel}
            </p>
          </div>
          <span className="inline-flex h-7 items-center rounded-pill bg-foreground px-3 text-[11.5px] font-medium text-background">
            En turno
          </span>
        </div>

        <div className="mt-5 grid gap-7 sm:grid-cols-3">
          <WorkerMetric
            label="Entradas registradas"
            value={entriesToday}
            note="hoy"
            tone="accent"
          />
          <WorkerMetric
            label="Salidas registradas"
            value={outputsToday}
            note={`${salesToday} ventas · ${wasteToday} mermas`}
            tone="ink"
          />
          <WorkerMetric
            label="Servicios atendidos"
            value={servicesToday}
            note="impresiones, copias"
            tone="primary"
          />
        </div>
      </section>

      <aside className="flex flex-col rounded-card border border-border bg-card p-5">
        <h3 className="font-display text-[16px] font-medium">
          Alertas operativas
        </h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          Productos a vigilar
        </p>

        <div
          className={cn(
            'mt-3 flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5',
            outOfStockCount > 0
              ? 'border-error/15 bg-error-surface'
              : 'border-border bg-surface-muted',
          )}
        >
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13px] font-medium',
                outOfStockCount > 0 ? 'text-error' : 'text-foreground',
              )}
            >
              Sin stock
            </p>
            <p
              className={cn(
                'text-[11px]',
                outOfStockCount > 0 ? 'text-error/75' : 'text-muted-foreground',
              )}
            >
              {outOfStockCount === 1
                ? '1 producto'
                : `${outOfStockCount} productos`}
            </p>
          </div>
          <span
            className={cn(
              'rounded-pill px-2.5 py-1 text-[11px] font-semibold',
              outOfStockCount > 0
                ? 'bg-error text-error-foreground'
                : 'bg-surface text-muted-foreground',
            )}
          >
            {outOfStockCount > 0 ? '!' : '0'}
          </span>
        </div>

        <div
          className={cn(
            'mt-2 flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5',
            lowStockCount > 0 ? 'bg-warning-surface' : 'bg-surface-muted',
          )}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              Bajo stock
            </p>
            <p className="text-[11px] text-muted-foreground">
              {lowStockCount} {lowStockCount === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          <span
            className={cn(
              'rounded-pill px-2.5 py-1 text-[11px] font-semibold',
              lowStockCount > 0
                ? 'bg-warning text-warning-foreground'
                : 'bg-surface text-muted-foreground',
            )}
          >
            {lowStockCount}
          </span>
        </div>
      </aside>
    </div>
  );
}

function WorkerMetric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: 'accent' | 'ink' | 'primary';
}) {
  const toneClass = {
    accent: 'text-accent-600',
    ink: 'text-foreground',
    primary: 'text-primary',
  }[tone];

  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 font-display text-[38px] font-medium leading-none tracking-tight',
          toneClass,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] text-muted-foreground">{note}</p>
    </div>
  );
}

/* ------------------------- Movements panel ------------------------- */

type MovementWithRelations = {
  id: string;
  movementType: StockMovementType;
  direction: StockMovementDirection;
  quantity: { toNumber: () => number } | number | string;
  occurredAt: Date;
  product: { name: string; sku: string | null };
  performedBy: { firstName: string } | null;
};

function RecentMovementsPanel({
  movements,
  showOwnerFilter,
}: {
  movements: MovementWithRelations[];
  showOwnerFilter: boolean;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[18px] font-medium">
          Movimientos recientes
        </h3>
        <Link
          className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          href="/stock"
        >
          Ver todos &rarr;
        </Link>
      </header>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Chip active>{showOwnerFilter ? 'Mis registros' : 'Todos'}</Chip>
        {showOwnerFilter ? <Chip>Toda la tienda</Chip> : <Chip>Ventas</Chip>}
        {showOwnerFilter ? <Chip>Hoy</Chip> : <Chip>Mermas</Chip>}
        {!showOwnerFilter ? <Chip>Uso interno</Chip> : null}
        {!showOwnerFilter ? <Chip>Entradas</Chip> : null}
      </div>

      {movements.length ? (
        <ul className="mt-1.5 divide-y divide-oat-100">
          {movements.map((movement) => (
            <MovementRow key={movement.id} movement={movement} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-[13px] text-muted-foreground">
          Sin movimientos recientes.
        </p>
      )}
    </section>
  );
}

function Chip({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        'rounded-pill border px-2.5 py-1 text-[11.5px] font-medium',
        active
          ? 'border-transparent bg-foreground text-background'
          : 'border-transparent bg-surface-muted text-muted-foreground hover:border-border',
      )}
    >
      {children}
    </span>
  );
}

function MovementRow({ movement }: { movement: MovementWithRelations }) {
  const config = movementVisualConfig(
    movement.movementType,
    movement.direction,
  );
  const qty = decimalToNumber(movement.quantity);
  const positive = movement.direction === 'IN';

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 py-3.5">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
          config.iconClass,
        )}
      >
        <config.Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-foreground">
          {movement.product.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          {movement.product.sku ? <span>{movement.product.sku}</span> : null}
          {movement.performedBy ? (
            <>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
              <span className="font-medium text-foreground/70">
                {movement.performedBy.firstName}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <span
        className={cn(
          'rounded-md px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide',
          config.badgeClass,
        )}
      >
        {config.label}
      </span>
      <span className="text-right">
        <span
          className={cn(
            'block font-display text-[18px] font-medium leading-tight',
            positive ? 'text-accent-600' : 'text-foreground',
          )}
        >
          {positive ? '+' : '−'}
          {Math.round(qty)}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatRelativeTime(movement.occurredAt)}
        </span>
      </span>
    </li>
  );
}

function movementVisualConfig(
  type: StockMovementType,
  direction: StockMovementDirection,
) {
  if (direction === 'IN' || type === 'PURCHASE_ENTRY') {
    return {
      Icon: ArrowDownLeft,
      label: 'Entrada',
      iconClass: 'bg-info-100 text-info-600',
      badgeClass: 'bg-info-100 text-info-600',
    };
  }

  switch (type) {
    case 'SALE':
      return {
        Icon: Receipt,
        label: 'Venta',
        iconClass: 'bg-accent-100 text-accent-600',
        badgeClass: 'bg-accent-100 text-accent-600',
      };
    case 'WASTE':
      return {
        Icon: Trash2,
        label: 'Merma',
        iconClass: 'bg-error-surface text-error',
        badgeClass: 'bg-error-surface text-error',
      };
    case 'INTERNAL_USE':
      return {
        Icon: ArrowDownRight,
        label: 'Uso interno',
        iconClass: 'bg-oat-200 text-oat-700',
        badgeClass: 'bg-oat-200 text-oat-700',
      };
    case 'SERVICE_CONSUMPTION':
      return {
        Icon: Settings2,
        label: 'Servicio',
        iconClass: 'bg-primary-100 text-primary',
        badgeClass: 'bg-primary-100 text-primary',
      };
    default:
      return {
        Icon: ArrowDownRight,
        label: 'Salida',
        iconClass: 'bg-oat-200 text-oat-700',
        badgeClass: 'bg-oat-200 text-oat-700',
      };
  }
}

/* ------------------------- Attention panel ------------------------- */

type AttentionItem = {
  product: {
    id: string;
    name: string;
    sku: string | null;
    currentStock: { toNumber: () => number } | number | string;
    minimumStock: { toNumber: () => number } | number | string;
  };
  status: 'out' | 'low';
};

function AttentionPanel({
  items,
  outOfStock,
  lowStock,
}: {
  items: AttentionItem[];
  outOfStock: number;
  lowStock: number;
}) {
  const total = outOfStock + lowStock;

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[18px] font-medium">Atencion</h3>
        <Link
          className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          href="/stock?status=low"
        >
          Ver stock &rarr;
        </Link>
      </header>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Chip active>{`Todos · ${total}`}</Chip>
        <Chip>{`Sin stock · ${outOfStock}`}</Chip>
        <Chip>{`Bajo · ${lowStock}`}</Chip>
      </div>

      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map(({ product, status }) => {
            const isOut = status === 'out';
            const stock = decimalToNumber(product.currentStock);
            const minimum = decimalToNumber(product.minimumStock);
            return (
              <li
                className={cn(
                  'grid grid-cols-[1fr_auto] items-center gap-2.5 rounded-[12px] border px-3.5 py-3',
                  isOut
                    ? 'border-error/18 bg-error-surface'
                    : 'border-transparent bg-warning-surface',
                )}
                key={product.id}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      'truncate text-[13px] font-medium',
                      isOut ? 'text-error' : 'text-foreground',
                    )}
                  >
                    {product.name}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 truncate font-mono text-[11px] tracking-[0.02em]',
                      isOut ? 'text-error/70' : 'text-muted-foreground',
                    )}
                  >
                    {product.sku ?? 'Sin SKU'} · min {Math.round(minimum)}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold',
                    isOut
                      ? 'bg-error text-error-foreground'
                      : 'bg-warning text-warning-foreground',
                  )}
                >
                  {isOut
                    ? 'Sin stock'
                    : `${Math.round(stock)} / ${Math.round(minimum)}`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-accent-600" strokeWidth={2} />
          Todo el stock dentro de los minimos.
        </div>
      )}
    </section>
  );
}
