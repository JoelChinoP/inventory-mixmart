import Image from "next/image";
import { Camera, ShieldCheck } from "lucide-react";

import {
  FlashMessage,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/shared";
import { formatDate, roleLabels } from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import { updateOwnProfile } from "@/server/actions";
import { MAX_AVATAR_BYTES, RECOMMENDED_AVATAR_BYTES } from "@/services";

type ProfilePageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

const errorMessages = {
  size: `La imagen supera ${formatMegabytes(MAX_AVATAR_BYTES)}.`,
  type: "Usa una imagen JPG, PNG o WebP.",
  duplicate: "Ese correo o DNI ya esta registrado en otra cuenta.",
} as const;

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await requireActiveUser("/profile");
  const params = await searchParams;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mi perfil"
        description="Actualiza tus datos visibles y la imagen que te identifica dentro del sistema."
      />

      {params.success ? (
        <FlashMessage type="success">Perfil actualizado correctamente.</FlashMessage>
      ) : null}
      {params.error && params.error in errorMessages ? (
        <FlashMessage type="error">
          {errorMessages[params.error as keyof typeof errorMessages]}
        </FlashMessage>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Section>
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
                {user.avatarUrl ? (
                  <Image
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover"
                    fill
                    priority
                    sizes="128px"
                    src={user.avatarUrl}
                    unoptimized
                  />
                ) : (
                  initials
                )}
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <StatusBadge tone="info">{roleLabels[user.role]}</StatusBadge>
                <StatusBadge tone="success">Activo</StatusBadge>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-card border border-border bg-surface-muted p-4 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                <span className="font-semibold">Cuenta protegida</span>
              </div>
              <p className="text-muted-foreground">
                Tu rol y usuario los gestiona un administrador. Tus datos personales
                puedes mantenerlos al dia aqui.
              </p>
              <p className="text-xs text-muted-foreground">
                Ultimo acceso: {formatDate(user.lastLoginAt)}
              </p>
            </div>
          </div>
        </Section>

        <Section>
          <SectionHeader
            title="Datos personales"
            description="Los cambios se aplican solo a tu cuenta."
          />
          <form
            action={updateOwnProfile}
            className="grid gap-4 p-6 md:grid-cols-2"
            encType="multipart/form-data"
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Nombre
              </span>
              <input
                className="input"
                defaultValue={user.firstName}
                name="firstName"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Apellido
              </span>
              <input
                className="input"
                defaultValue={user.lastName}
                name="lastName"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Correo
              </span>
              <input
                className="input"
                defaultValue={user.email ?? ""}
                name="email"
                type="email"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Telefono
              </span>
              <input className="input" defaultValue={user.phone ?? ""} name="phone" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">DNI</span>
              <input className="input" defaultValue={user.dni ?? ""} name="dni" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Usuario
              </span>
              <input
                className="input"
                defaultValue={user.username}
                disabled
                readOnly
              />
            </label>

            <div className="space-y-3 rounded-card border border-border bg-surface-muted p-4 md:col-span-2">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <Camera aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Imagen de perfil
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Maximo {formatMegabytes(MAX_AVATAR_BYTES)}. Recomendado{" "}
                    {formatMegabytes(RECOMMENDED_AVATAR_BYTES)} o menos para que
                    cargue rapido.
                  </p>
                </div>
              </div>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="input"
                name="avatar"
                type="file"
              />
              {user.avatarUrl ? (
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    name="removeAvatar"
                    type="checkbox"
                    value="true"
                  />
                  Quitar imagen actual
                </label>
              ) : null}
            </div>

            <div className="flex justify-end md:col-span-2">
              <SubmitButton>Guardar perfil</SubmitButton>
            </div>
          </form>
        </Section>
      </div>
    </div>
  );
}
