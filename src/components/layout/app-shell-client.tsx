'use client';

import {
  BarChart3,
  Boxes,
  ChevronRight,
  Home,
  Package,
  PackagePlus,
  Send,
  Settings2,
  Truck,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { roleLabels } from '@/lib/format';
import { canAccessPath } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { UserRole } from '../../../prisma/generated/client';

type AppTopBarUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

const navigationGroups = [
  {
    label: 'Operaciones',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/stock', label: 'Stock', icon: Boxes },
      { href: '/entries', label: 'Entradas', icon: PackagePlus },
      { href: '/outputs', label: 'Salidas', icon: Send },
      { href: '/services', label: 'Servicios', icon: Settings2 },
    ],
  },
  {
    label: 'Catalogo',
    items: [
      { href: '/products', label: 'Productos', icon: Package },
      { href: '/suppliers', label: 'Proveedores', icon: Truck },
      { href: '/reports', label: 'Reportes', icon: BarChart3 },
      { href: '/users', label: 'Usuarios', icon: Users },
    ],
  },
] as const;

const routeDescriptions = [
  {
    href: '/stock',
    title: 'Stock',
    description: 'Disponibilidad actual y ultima actividad por producto.',
  },
  {
    href: '/entries',
    title: 'Entradas',
    description:
      'Ordenes y compras recibidas. Recibir una orden actualiza el stock una sola vez.',
  },
  {
    href: '/outputs',
    title: 'Salidas',
    description:
      'Ventas, mermas y uso interno con validacion de stock en el servidor.',
  },
  {
    href: '/services',
    title: 'Servicios',
    description:
      'Servicios internos con consumo de insumos y trabajos tercerizados.',
  },
  {
    href: '/products',
    title: 'Productos',
    description: 'Catalogo, precios de referencia y stock actual por producto.',
  },
  {
    href: '/suppliers',
    title: 'Proveedores',
    description: 'Datos de contacto, estado y compras recientes.',
  },
  {
    href: '/reports',
    title: 'Reportes',
    description:
      'Analisis administrativo con datos historicos congelados en entradas, salidas y movimientos.',
  },
  {
    href: '/users',
    title: 'Usuarios',
    description: 'Gestion administrativa de cuentas internas y roles.',
  },
  {
    href: '/profile',
    title: 'Mi perfil',
    description:
      'Actualiza tus datos visibles y la imagen que te identifica dentro del sistema.',
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
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-normal transition',
                  active
                    ? 'bg-foreground font-medium text-background'
                    : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
                )}
                href={item.href}
                key={item.href}
                prefetch="auto"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active ? 'opacity-100' : 'opacity-70',
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
  if (role === 'WORKER') return 'Hola';
  if (hour < 12) return 'Buenos dias';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function AppTopBar({ user }: { user: AppTopBarUser }) {
  const pathname = usePathname();
  const onDashboard = isActive(pathname, '/dashboard');
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;
  const currentRoute =
    routeDescriptions.find((route) => isActive(pathname, route.href)) ?? null;

  const heading = onDashboard
    ? `${getGreeting(user.role)}, ${user.firstName}`
    : (currentRoute?.title ?? 'El Colorado');
  const description = onDashboard
    ? user.role === 'ADMIN'
      ? 'Resumen financiero, movimientos recientes y alertas para toda la tienda.'
      : 'Resumen operativo, movimientos recientes y alertas para tu jornada.'
    : (currentRoute?.description ?? 'Libreria y Bazar');

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/92 px-4 pb-3 pt-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:pb-4 sm:pt-6 lg:px-9">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-medium leading-tight tracking-tight text-foreground sm:text-[28px]">
            {heading}
          </h1>
          <p className="mt-1 line-clamp-2 max-w-3xl text-[12.5px] leading-5 text-foreground/72 sm:text-[14px] sm:leading-6">
            {description}
          </p>
        </div>
        <Link
          aria-label={`${fullName} - Mi perfil`}
          className="group flex max-w-full shrink-0 items-center gap-3 rounded-[16px] border border-border bg-surface/90 p-1.5 shadow-soft transition hover:-translate-y-px hover:border-primary-200 hover:bg-surface hover:shadow-elevated sm:rounded-[18px] sm:pr-4"
          href="/profile"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary-100 bg-primary-50 text-sm font-semibold text-primary sm:h-11 sm:w-11 sm:rounded-full">
            {user.avatarUrl ? (
              <Image
                alt=""
                className="h-full w-full object-cover"
                height={44}
                sizes="44px"
                src={user.avatarUrl}
                unoptimized
                width={44}
              />
            ) : (
              initials
            )}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-left text-sm font-semibold text-foreground">
              {fullName}
            </span>
            <span className="block truncate text-left text-[12px] text-foreground/70">
              {roleLabels[user.role]}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary sm:block"
          />
        </Link>
      </div>
    </header>
  );
}

export function MobileNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = getVisibleGroups(role).flatMap((group) => group.items);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-[22px] border border-primary-100 bg-surface/94 p-1.5 shadow-elevated backdrop-blur lg:hidden">
      {visibleItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-label={item.label}
            className={cn(
              'flex h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[10.5px] font-semibold transition',
              active
                ? 'bg-primary text-primary-foreground shadow-pill'
                : 'text-muted-foreground hover:bg-primary-50 hover:text-primary',
            )}
            href={item.href}
            key={item.href}
            prefetch="auto"
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
