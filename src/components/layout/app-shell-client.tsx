"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Home,
  Package,
  PackagePlus,
  Send,
  Settings,
  Settings2,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { canAccessPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "../../../prisma/generated/client";

type AppTopBarUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  role: UserRole;
};

const navigationGroups = [
  {
    label: "Operaciones",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/stock", label: "Stock", icon: Boxes },
      { href: "/entries", label: "Entradas", icon: PackagePlus },
      { href: "/outputs", label: "Salidas", icon: Send },
      { href: "/services", label: "Servicios", icon: Settings2 },
    ],
  },
  {
    label: "Catalogo",
    items: [
      { href: "/products", label: "Productos", icon: Package },
      { href: "/suppliers", label: "Proveedores", icon: Truck },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/reports", label: "Reportes", icon: BarChart3 },
      { href: "/users", label: "Usuarios", icon: Users },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getVisibleGroups(role: UserRole) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

export function AppNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(role).flatMap((group) => group.items);

  return (
    <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-8">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            className={cn(
              "flex min-h-[60px] items-center gap-4 rounded-card px-6 text-lg font-medium transition duration-150 ease-out",
              active
                ? "bg-primary-100 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-primary-50 hover:text-primary",
            )}
            href={item.href}
            key={item.href}
            prefetch="auto"
          >
            <Icon aria-hidden="true" className="h-6 w-6" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppTopBar({ user }: { user: AppTopBarUser }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(user.role).flatMap((group) => group.items);
  const currentModule =
    visibleItems.find((item) => isActive(pathname, item.href))?.label ?? "MixMart";
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-8 backdrop-blur supports-[backdrop-filter]:bg-background/88 lg:px-10">
      <div className="flex min-h-16 items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {currentModule}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {isDashboard
              ? `Resumen operativo del inventario para ${
                  user.role === "ADMIN" ? "Admin" : "Usuario"
                }.`
              : "Gestiona la operacion diaria de inventario."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <button
            aria-label="Notificaciones"
            className="hidden h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground shadow-soft transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary sm:inline-flex"
            type="button"
          >
            <Bell aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            aria-label="Configuracion"
            className="hidden h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-elevated text-muted-foreground shadow-soft transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary sm:inline-flex"
            type="button"
          >
            <Settings aria-hidden="true" className="h-8 w-8" />
          </button>
          <button
            aria-label={`${user.firstName} ${user.lastName}`}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary-900 text-primary-foreground shadow-soft transition hover:border-primary-200 hover:bg-primary"
            type="button"
          >
            <UserRound aria-hidden="true" className="h-7 w-7" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(role).flatMap((group) => group.items);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-card border border-border bg-surface/98 shadow-soft backdrop-blur lg:hidden">
      {visibleItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-label={item.label}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:bg-primary-50 hover:text-primary",
            )}
            href={item.href}
            key={item.href}
            prefetch="auto"
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
