import { Plus } from "lucide-react";
import { Fragment, Suspense } from "react";

import {
  EmptyState,
  FlashMessage,
  OperationalPageSkeleton,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/shared";
import { formatDate, roleLabels } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createUser, setUserActive, updateUser } from "@/server/actions";
import type { UserRole } from "../../../../prisma/generated/client";

type UsersPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const roles: UserRole[] = ["ADMIN", "WORKER"];

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <Suspense fallback={<OperationalPageSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({ searchParams }: UsersPageProps) {
  await requireRole(["ADMIN"], "/users");
  const params = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    take: 150,
  });

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestion administrativa de cuentas internas y roles."
      />

      {params.success ? (
        <FlashMessage type="success">Usuario guardado correctamente.</FlashMessage>
      ) : null}
      {params.error === "self" ? (
        <FlashMessage type="error">No puedes desactivar tu propia cuenta.</FlashMessage>
      ) : null}

      <UserForm />

      <Section>
        <SectionHeader title="Usuarios registrados" />
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ultimo acceso</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <Fragment key={user.id}>
                    <tr className={user.isActive ? "" : "bg-surface-muted/45"}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{user.email || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phone || user.dni || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{roleLabels[user.role]}</td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <StatusBadge tone="success">Activo</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Inactivo</StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(user.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <form action={setUserActive}>
                          <input name="id" type="hidden" value={user.id} />
                          <input
                            name="isActive"
                            type="hidden"
                            value={user.isActive ? "false" : "true"}
                          />
                          <SubmitButton className="btn btn-ghost border border-border">
                            {user.isActive ? "Desactivar" : "Activar"}
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                    <tr className="bg-surface-muted/45">
                      <td className="px-4 py-3" colSpan={6}>
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            Editar usuario
                          </summary>
                          <UserForm mode="edit" user={user} />
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin usuarios" />
        )}
      </Section>
    </div>
  );
}

function UserForm({
  mode = "create",
  user,
}: {
  mode?: "create" | "edit";
  user?: {
    id: string;
    username: string;
    email: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    dni: string | null;
    role: UserRole;
  };
}) {
  const isEdit = mode === "edit" && user;

  return (
    <Section className={isEdit ? "mt-3 border-border/70 shadow-none" : "mb-5"}>
      <SectionHeader title={isEdit ? "Editar usuario" : "Nuevo usuario"} />
      <form
        action={isEdit ? updateUser : createUser}
        className="grid gap-3 p-4 md:grid-cols-3"
      >
        {isEdit ? <input name="id" type="hidden" value={user.id} /> : null}
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Usuario</span>
          <input className="input" defaultValue={user?.username} name="username" required />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Correo</span>
          <input className="input" defaultValue={user?.email ?? ""} name="email" type="email" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Rol</span>
          <select className="input" defaultValue={user?.role ?? "WORKER"} name="role">
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Nombre</span>
          <input className="input" defaultValue={user?.firstName} name="firstName" required />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Apellido</span>
          <input className="input" defaultValue={user?.lastName} name="lastName" required />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Telefono</span>
          <input className="input" defaultValue={user?.phone ?? ""} name="phone" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">DNI</span>
          <input className="input" defaultValue={user?.dni ?? ""} name="dni" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isEdit ? "Nueva contrasena" : "Contrasena inicial"}
          </span>
          <input
            className="input"
            minLength={8}
            name="password"
            required={!isEdit}
            type="password"
          />
        </label>
        <div className="md:col-span-3">
          <SubmitButton>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </SubmitButton>
        </div>
      </form>
    </Section>
  );
}
