"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowDownRight,
  Receipt,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { formatRelativeTime } from "@/lib/date-range";
import { decimalToNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardMovement } from "@/services/dashboard.service";
import type { StockMovementDirection, StockMovementType } from "../../../prisma/generated/client";

type MovementFilter = "all" | "mine" | StockMovementType;

type RecentMovementsPanelProps = {
  currentUserId: string;
  movements: DashboardMovement[];
  showOwnerFilter: boolean;
};

const movementFilters: { label: string; value: MovementFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Ventas", value: "SALE" },
  { label: "Mermas", value: "WASTE" },
  { label: "Uso interno", value: "INTERNAL_USE" },
  { label: "Entradas", value: "PURCHASE_ENTRY" },
  { label: "Servicios", value: "SERVICE_CONSUMPTION" },
];

export function RecentMovementsPanel({
  currentUserId,
  movements,
  showOwnerFilter,
}: RecentMovementsPanelProps) {
  const [filter, setFilter] = useState<MovementFilter>(
    showOwnerFilter ? "mine" : "all",
  );
  const filters = showOwnerFilter
    ? [{ label: "Mis registros", value: "mine" as const }, ...movementFilters]
    : movementFilters;
  const visibleMovements = movements
    .filter((movement) => {
      if (filter === "all") return true;
      if (filter === "mine") return movement.performedById === currentUserId;
      return movement.movementType === filter;
    })
    .slice(0, 5); // Show only the 5 most recent movements for the selected filter

    /* .slice(0, filter === "all" ? 10 : 5); */
  return (
    <section className="rounded-card border border-border bg-card p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[17px] font-medium sm:text-[18px]">
          Movimientos recientes
        </h3>
        <Link
          className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          href="/stock"
        >
          Ver todos
        </Link>
      </header>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((item) => (
          <Chip
            active={filter === item.value}
            key={item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {visibleMovements.length ? (
        <ul className="mt-1 divide-y divide-oat-100">
          {visibleMovements.map((movement) => (
            <MovementRow key={movement.id} movement={movement} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-[13px] text-muted-foreground">
          Sin movimientos para este filtro.
        </p>
      )}
    </section>
  );
}

function Chip({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "shrink-0 rounded-pill border px-2.5 py-1 text-[11.5px] font-medium transition",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-transparent bg-surface-muted text-muted-foreground hover:border-border hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MovementRow({ movement }: { movement: DashboardMovement }) {
  const config = movementVisualConfig(
    movement.movementType,
    movement.direction,
  );
  const qty = decimalToNumber(movement.quantity);
  const positive = movement.direction === "IN";

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-3.5 sm:py-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
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
          <span className="sm:hidden">{config.label}</span>
        </p>
      </div>
      <span
        className={cn(
          "hidden rounded-md px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide sm:inline-flex",
          config.badgeClass,
        )}
      >
        {config.label}
      </span>
      <span className="text-right">
        <span
          className={cn(
            "block font-display text-[18px] font-medium leading-tight",
            positive ? "text-accent-600" : "text-foreground",
          )}
        >
          {positive ? "+" : "-"}
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
  if (direction === "IN" || type === "PURCHASE_ENTRY") {
    return {
      Icon: ArrowDownLeft,
      label: "Entrada",
      iconClass: "bg-info-100 text-info-600",
      badgeClass: "bg-info-100 text-info-600",
    };
  }

  switch (type) {
    case "SALE":
      return {
        Icon: Receipt,
        label: "Venta",
        iconClass: "bg-accent-100 text-accent-600",
        badgeClass: "bg-accent-100 text-accent-600",
      };
    case "WASTE":
      return {
        Icon: Trash2,
        label: "Merma",
        iconClass: "bg-error-surface text-error",
        badgeClass: "bg-error-surface text-error",
      };
    case "INTERNAL_USE":
      return {
        Icon: ArrowDownRight,
        label: "Uso interno",
        iconClass: "bg-oat-200 text-oat-700",
        badgeClass: "bg-oat-200 text-oat-700",
      };
    case "SERVICE_CONSUMPTION":
      return {
        Icon: Settings2,
        label: "Servicio",
        iconClass: "bg-primary-100 text-primary",
        badgeClass: "bg-primary-100 text-primary",
      };
    default:
      return {
        Icon: ArrowDownRight,
        label: "Salida",
        iconClass: "bg-oat-200 text-oat-700",
        badgeClass: "bg-oat-200 text-oat-700",
      };
  }
}
