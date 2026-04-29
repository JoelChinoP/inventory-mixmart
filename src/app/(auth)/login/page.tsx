import { getServerSession } from 'next-auth/next';
import Image from 'next/image';
import { Store } from 'lucide-react';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { authOptions, getSafeCallbackUrl } from '@/lib/auth';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const initialError = params.error
    ? 'No se pudo iniciar sesion. Revisa tus datos e intenta de nuevo.'
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-card border border-border bg-surface-elevated shadow-soft lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden bg-surface-muted p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary text-sm font-semibold text-primary-foreground">
              <Store aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                Inventario
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Libreria y Bazar
              </p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center py-8">
            <Image
              alt="Libros y utiles de inventario"
              className="h-auto w-full max-w-[330px]"
              height={532}
              priority
              src="/books.svg"
              width={360}
            />
          </div>
        </div>

        <div className="flex min-h-[600px] items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary text-sm font-semibold text-primary-foreground">
                  <Store aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    El Colorado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inventario interno
                  </p>
                </div>
              </div>
              <Image
                alt="Libros y utiles"
                className="h-16 w-auto"
                height={96}
                priority
                src="/books.svg"
                width={64}
              />
            </div>

            <div className="mb-7 space-y-3">
              <p className="badge border-success-border bg-success-surface text-success">
                Inventario librería/bazar
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Iniciar sesion
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  Acceso interno para usuarios asignados por el administrador.
                </p>
              </div>
            </div>

            <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
          </div>
        </div>
      </section>
    </main>
  );
}
