import { Suspense } from "react";

import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { requireActiveUser } from "@/lib/auth";

export const runtime = "nodejs";

export default function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireActiveUser();

  return <AppShell user={user}>{children}</AppShell>;
}
