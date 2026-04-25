import { AppShell } from "@/components/layout/app-shell";
import { requireActiveUser } from "@/lib/auth";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireActiveUser();

  return <AppShell user={user}>{children}</AppShell>;
}
