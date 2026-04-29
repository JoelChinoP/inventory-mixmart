"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

type FormModalProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  size?: ModalSize;
  triggerClassName?: string;
};

export function FormModal({
  trigger,
  title,
  description,
  children,
  size = "md",
  triggerClassName,
}: FormModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        className={cn("btn btn-primary", triggerClassName)}
        onClick={() => setOpen(true)}
        type="button"
      >
        {trigger}
      </button>

      {open ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-md animate-overlay-in sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div
            className={cn(
              "relative my-auto w-full overflow-hidden rounded-card border border-border bg-surface-elevated shadow-elevated animate-dialog-in",
              sizeClass[size],
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-4">
              <div className="min-w-0">
                <h2
                  className="text-lg font-semibold tracking-tight text-foreground"
                  id={titleId}
                >
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto bg-surface-elevated">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
