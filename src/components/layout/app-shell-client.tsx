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
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { canAccessPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "../../../prisma/generated/client";

type AppTopBarUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
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
  const groups = getVisibleGroups(role);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      {groups.map((group, groupIndex) => (
        <Fragment key={group.label}>
          {groupIndex > 0 ? (
            <div className="mx-3 my-2 h-px bg-border" aria-hidden="true" />
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-normal transition",
                  active
                    ? "bg-foreground font-medium text-background"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
                prefetch="auto"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "opacity-100" : "opacity-70",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}

function getGreeting(role: UserRole) {
  const hour = new Date().getHours();
  if (role === "WORKER") return "Hola";
  if (hour < 12) return "Buenos dias";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function AppTopBar({ user }: { user: AppTopBarUser }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(user.role).flatMap((group) => group.items);
  const onDashboard = isActive(pathname, "/dashboard");
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const heading = onDashboard
    ? `${getGreeting(user.role)}, ${user.firstName}`
    : pathname.startsWith("/profile")
      ? "Mi perfil"
      : visibleItems.find((item) => isActive(pathname, item.href))?.label ??
        "El Colorado";

  return (
    <header className="sticky top-0 z-20 bg-background/85 px-4 pt-7 pb-4 backdrop-blur supports-backdrop-filter:bg-background/75 lg:px-9">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-foreground">
          {heading}
        </h1>
        <Link
          aria-label={`${user.firstName} ${user.lastName} - Mi perfil`}
          className="group flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-semibold text-primary-foreground transition hover:bg-primary-hover"
          href="/profile"
        >
          {user.avatarUrl ? (
            <Image
              alt=""
              className="h-full w-full object-cover"
              height={36}
              sizes="36px"
              src={user.avatarUrl}
              width={36}
            />
          ) : (
            initials
          )}
        </Link>
      </div>
    </header>
  );
}

export function MobileNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(role).flatMap((group) => group.items);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-card border border-border bg-surface/98 backdrop-blur lg:hidden">
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
