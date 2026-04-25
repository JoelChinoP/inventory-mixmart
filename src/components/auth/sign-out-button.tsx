"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  compact?: boolean;
};

export function SignOutButton({ compact = false }: SignOutButtonProps) {
  return (
    <button
      className="btn btn-ghost"
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Cerrar sesion"
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {compact ? <span className="sr-only">Cerrar sesion</span> : "Cerrar sesion"}
    </button>
  );
}
