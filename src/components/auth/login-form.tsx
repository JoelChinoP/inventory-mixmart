"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  callbackUrl: string;
  initialError?: string;
};

export function LoginForm({ callbackUrl, initialError }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      identifier,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      setError("No se pudo iniciar sesion. Revisa tus datos e intenta de nuevo.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleSubmitting(true);
    await signIn("google", { callbackUrl });
    setIsGoogleSubmitting(false);
  }

  return (
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="identifier">
            Usuario o correo
          </label>
          <input
            autoComplete="username"
            className="input"
            id="identifier"
            name="identifier"
            placeholder="admin o correo@ejemplo.com"
            required
            type="text"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Contrasena
          </label>
          <input
            autoComplete="current-password"
            className="input"
            id="password"
            name="password"
            required
            type="password"
          />
        </div>

        {error ? (
          <p className="rounded-control border border-error-border bg-error-surface px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}

        <button className="btn btn-primary w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>o</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        className="btn btn-ghost w-full border border-border bg-surface"
        disabled={isGoogleSubmitting}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {isGoogleSubmitting ? "Conectando..." : "Continuar con Google"}
      </button>
    </div>
  );
}
