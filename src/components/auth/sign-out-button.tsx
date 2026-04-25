"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  compact?: boolean;
  className?: string;
};

export function SignOutButton({ compact = false, className }: SignOutButtonProps) {
  return (
    <button
      className={cn("btn btn-ghost", className)}
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Cerrar sesion"
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {compact ? <span className="sr-only">Cerrar sesion</span> : "Cerrar sesion"}
    </button>
  );
}
