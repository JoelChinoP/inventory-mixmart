import type { ReactNode } from 'react';
import Link from 'next/link';
import { CircleHelp, Plus } from 'lucide-react';

import { SignOutButton } from '@/components/auth/sign-out-button';
import {
  AppNavigation,
  AppTopBar,
  MobileNavigation,
} from '@/components/layout/app-shell-client';
import type { UserRole } from '../../../prisma/generated/client';

type AppShellUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

type AppShellProps = {
  children: ReactNode;
  user: AppShellUser;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-5 border-r border-border bg-background px-5 py-7 lg:flex">
        <div className="px-2">
          <p className="font-display text-[30px] font-medium leading-[1.05] tracking-tight text-foreground">
            El Colorado
          </p>
          <p className="mt-1 text-[12px] tracking-wide text-muted-foreground">
            Libreria y Bazar
          </p>
        </div>

        <Link
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-pill transition hover:-translate-y-px hover:bg-primary-hover"
          href="/entries"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
          Nuevo registro
        </Link>

        <AppNavigation role={user.role} />

        <div className="mt-auto flex flex-col gap-1">
          <button
            className="flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-normal text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
            type="button"
          >
            <CircleHelp aria-hidden="true" className="h-4 w-4 opacity-70" />
            Ayuda
          </button>
          <SignOutButton className="h-9 w-full justify-start gap-3 rounded-lg px-3 text-[13.5px] font-normal text-muted-foreground hover:bg-black/5 hover:text-foreground" />
        </div>
      </aside>

      <div className="lg:pl-66">
        <AppTopBar user={user} />

        <main className="w-full px-4 pb-24 pt-5 lg:px-9 lg:pb-12 lg:pt-2">
          {children}
        </main>

        <MobileNavigation role={user.role} />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-5 border-r border-border bg-background px-5 py-7 lg:flex">
        <div className="px-2">
          <div className="h-7 w-32 animate-pulse rounded bg-oat-200" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-oat-200" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-pill bg-oat-200" />
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="h-9 animate-pulse rounded-lg bg-oat-200"
              key={index}
            />
          ))}
        </div>
      </aside>

      <div className="lg:pl-66">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/92 px-4 pt-6 pb-4 backdrop-blur lg:px-9">
          <div className="flex items-center justify-between gap-4">
            <div className="h-7 w-48 animate-pulse rounded bg-oat-200" />
            <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-2 py-1.5">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-oat-200" />
              <div className="hidden space-y-2 sm:block">
                <div className="h-4 w-28 animate-pulse rounded bg-oat-200" />
                <div className="h-3 w-22 animate-pulse rounded bg-oat-200" />
              </div>
            </div>
          </div>
        </header>
        <main className="w-full px-4 pb-24 pt-5 lg:px-9 lg:pt-2">
          <div className="space-y-4">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-17 animate-pulse rounded-card border border-border bg-surface"
                  key={index}
                />
              ))}
            </div>
            <div className="h-56 animate-pulse rounded-card border border-border bg-surface" />
            <div className="h-72 animate-pulse rounded-card border border-border bg-surface" />
          </div>
        </main>
      </div>
    </div>
  );
}
