"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  showPendingLabel?: boolean;
  className?: string;
} & Omit<ComponentProps<"button">, "children" | "className" | "type">;

export function SubmitButton({
  children,
  pendingLabel = "Guardando...",
  showPendingLabel = true,
  className = "btn btn-primary",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      aria-busy={pending}
      className={className}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {showPendingLabel ? pendingLabel : <span className="sr-only">{pendingLabel}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
