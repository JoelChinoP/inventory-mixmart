import type { ReactNode } from "react";
import Link from "next/link";
import { CircleHelp, Plus, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  AppNavigation,
  AppTopBar,
  MobileNavigation,
} from "@/components/layout/app-shell-client";
import type { UserRole } from "../../../prisma/generated/client";

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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-border bg-surface-muted text-foreground lg:flex lg:flex-col">
        <div className="px-10 pb-8 pt-10">
          <p className="text-3xl font-semibold tracking-tight text-primary">
            El Colorado
          </p>
          <p className="mt-2 text-lg text-muted-foreground">
            Libreria y Bazar
          </p>
        </div>

        <div className="px-5">
          <Link
            className="btn btn-primary h-14 w-full justify-center rounded-pill px-6 text-[17px]"
            href="/entries"
          >
            <Plus aria-hidden="true" className="h-6 w-6" />
            Nuevo registro
          </Link>
        </div>

        <AppNavigation role={user.role} />

        <div className="mt-auto border-t border-border px-5 py-8">
          <Link
            className="flex h-12 w-full items-center gap-4 rounded-card px-6 text-base font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary"
            href="/profile"
          >
            <UserRound aria-hidden="true" className="h-6 w-6" />
            Mi perfil
          </Link>
          <button
            className="mt-3 flex h-12 w-full items-center gap-4 rounded-card px-6 text-base font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary"
            type="button"
          >
            <CircleHelp aria-hidden="true" className="h-6 w-6" />
            Ayuda
          </button>
          <SignOutButton className="mt-3 h-12 w-full justify-start rounded-card px-6 text-base font-medium text-muted-foreground hover:bg-primary-50 hover:text-primary" />
        </div>
      </aside>

      <div className="lg:pl-80">
        <AppTopBar user={user} />

        <main className="w-full px-4 py-7 pb-24 lg:px-10 lg:pb-10">
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-border bg-surface-muted lg:flex lg:flex-col">
        <div className="px-10 py-10">
          <div className="h-8 w-32 animate-pulse rounded bg-primary-100" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-1 flex-col gap-5 px-3 py-4">
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <div className="space-y-2" key={groupIndex}>
              <div className="mx-3 h-3 w-20 animate-pulse rounded bg-muted" />
              {Array.from({ length: groupIndex === 0 ? 5 : 2 }).map(
                (__, itemIndex) => (
                  <div
                    className="h-10 animate-pulse rounded-control bg-surface-muted"
                    key={itemIndex}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-44 animate-pulse rounded bg-muted" />
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-8 backdrop-blur lg:px-10">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <div>
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-40 animate-pulse rounded bg-primary-100" />
            </div>
            <div className="hidden h-9 w-28 animate-pulse rounded-control bg-muted sm:block" />
          </div>
        </header>
        <main className="w-full px-4 py-7 pb-24 lg:px-10 lg:pb-10">
          <div className="space-y-5">
            <div className="h-20 animate-pulse rounded-card border border-border bg-surface" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-32 animate-pulse rounded-card border border-border bg-surface"
                  key={index}
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-card border border-border bg-surface" />
          </div>
        </main>
      </div>
    </div>
  );
}
