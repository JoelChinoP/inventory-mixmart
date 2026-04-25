"use client";

import {
  BarChart3,
  Boxes,
  Home,
  Package,
  PackagePlus,
  Send,
  Settings2,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { canAccessPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "../../../prisma/generated/client";

type AppShellUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  role: UserRole;
};

type AppShellProps = {
  children: ReactNode;
  user: AppShellUser;
};

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/entries", label: "Entradas", icon: PackagePlus },
  { href: "/outputs", label: "Salidas", icon: Send },
  { href: "/services", label: "Servicios", icon: Settings2 },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/suppliers", label: "Proveedores", icon: Truck },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/users", label: "Usuarios", icon: Users },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) =>
    canAccessPath(user.role, item.href),
  );
  const currentModule =
    visibleNavigation.find((item) => isActive(pathname, item.href))?.label ??
    "MixMart";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="text-sm font-semibold text-primary">MixMart</p>
          <p className="mt-1 text-xs text-muted-foreground">Inventario interno</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={cn(
                  "flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary-50 hover:text-primary",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.role} {user.email ? `- ${user.email}` : ""}
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Inventario MixMart
              </p>
              <h1 className="text-lg font-semibold text-foreground">{currentModule}</h1>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <span className="badge border-primary-200 bg-primary-50 text-primary-700">
                {user.role}
              </span>
              <SignOutButton compact />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 lg:px-6 lg:pb-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface lg:hidden">
          {visibleNavigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                aria-label={item.label}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
