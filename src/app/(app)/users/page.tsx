import { Pencil, Plus } from 'lucide-react';
import { Fragment, Suspense } from 'react';

import {
  EmptyState,
  FlashMessage,
  OperationalPageSkeleton,
  PageHeader,
  Section,
  StatusBadge,
  SubmitButton,
} from '@/components/shared';
import { FormModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { formatDate, roleLabels } from '@/lib/format';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createUser, setUserActive, updateUser } from '@/server/actions';
import type { UserRole } from '../../../../prisma/generated/client';

type UsersPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const roles: UserRole[] = ['ADMIN', 'WORKER'];

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <Suspense fallback={<OperationalPageSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({ searchParams }: UsersPageProps) {
  await requireRole(['ADMIN'], '/users');
  const params = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    take: 150,
  });

  return (
    <div>
      <PageHeader
        action={
          <FormModal
            size="lg"
            title="Nuevo usuario"
            description="Crea cuentas para administradores o trabajadores."
            trigger={
              <>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nuevo usuario
              </>
            }
          >
            <UserFormBody />
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">
          Usuario guardado correctamente.
        </FlashMessage>
      ) : null}
      {params.error === 'self' ? (
        <FlashMessage type="error">
          No puedes desactivar tu propia cuenta.
        </FlashMessage>
      ) : null}

      <Section>
        {/* <SectionHeader title="Usuarios registrados" /> */}
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="table-operational-head">
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
                    <tr className={user.isActive ? '' : 'bg-surface-muted/45'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{user.email || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phone || user.dni || '-'}
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
                      <td className="px-4 py-3">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <FormModal
                            size="lg"
                            title="Editar usuario"
                            triggerClassName="btn-soft"
                            trigger={
                              <>
                                <Pencil
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                                Editar
                              </>
                            }
                          >
                            <UserFormBody user={user} />
                          </FormModal>
                          <form action={setUserActive}>
                            <input name="id" type="hidden" value={user.id} />
                            <input
                              name="isActive"
                              type="hidden"
                              value={user.isActive ? 'false' : 'true'}
                            />
                            <SubmitButton className="btn btn-ghost border border-border">
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </SubmitButton>
                          </form>
                        </div>
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

function UserFormBody({
  user,
}: {
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
  const isEdit = Boolean(user);

  return (
    <form
      action={isEdit ? updateUser : createUser}
      className="grid gap-4 p-6 md:grid-cols-3"
    >
      {isEdit && user ? (
        <input name="id" type="hidden" value={user.id} />
      ) : null}
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Usuario
        </span>
        <input
          className="input"
          defaultValue={user?.username}
          name="username"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Correo
        </span>
        <input
          className="input"
          defaultValue={user?.email ?? ''}
          name="email"
          type="email"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Rol</span>
        <Select
          defaultValue={user?.role ?? 'WORKER'}
          name="role"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Nombre
        </span>
        <input
          className="input"
          defaultValue={user?.firstName}
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
          defaultValue={user?.lastName}
          name="lastName"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Telefono
        </span>
        <input
          className="input"
          defaultValue={user?.phone ?? ''}
          name="phone"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">DNI</span>
        <input className="input" defaultValue={user?.dni ?? ''} name="dni" />
      </label>
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {isEdit ? 'Nueva contrasena' : 'Contrasena inicial'}
        </span>
        <input
          className="input"
          minLength={8}
          name="password"
          required={!isEdit}
          type="password"
        />
      </label>
      <div className="flex justify-end md:col-span-3">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </SubmitButton>
      </div>
    </form>
  );
}
