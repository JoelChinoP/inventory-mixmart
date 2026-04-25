import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { authOptions, getSafeCallbackUrl } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const initialError = params.error
    ? "No se pudo iniciar sesion. Revisa tus datos e intenta de nuevo."
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="card w-full max-w-md p-6">
        <div className="mb-6 space-y-2">
          <p className="badge border-secondary-200 bg-secondary-50 text-secondary-700">
            Inventario MixMart
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Iniciar sesion
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso interno para usuarios asignados por el administrador.
          </p>
        </div>

        <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
      </section>
    </main>
  );
}
