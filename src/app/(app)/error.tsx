"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-card border border-error-border bg-error-surface p-5 text-error">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">No se pudo cargar esta vista</h2>
          <p className="mt-1 text-sm">
            Intenta nuevamente. Si el problema continua, revisa la conexion o
            vuelve a iniciar sesion.
          </p>
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-2 break-words text-xs opacity-80">{error.message}</p>
          ) : null}
          <button className="btn btn-primary mt-4" onClick={reset} type="button">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    </section>
  );
}
