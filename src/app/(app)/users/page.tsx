import { Plus, Power, PowerOff } from 'lucide-react';
import { Suspense } from 'react';

import {
  DataTable,
  EmptyState,
  FlashMessage,
  ActionTip,
  IdActionForm,
  OperationalPageSkeleton,
  PageHeader,
  PaginationBar,
  RecordEditModal,
  Section,
  StatusBadge,
  iconBtnGood,
  iconBtnWarn,
} from '@/components/shared';
import { UserForm } from '@/components/users/user-form';
import { FormModal } from '@/components/ui/modal';
import { formatDate, roleLabels } from '@/lib/format';
import { requireRole } from '@/lib/auth';
import { buildPaginationMeta, readPagination } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { setUserActive } from '@/server/actions';

type UsersPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    page?: string;
    pageSize?: string;
  }>;
};

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
  const pagination = readPagination(params);

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.user.count(),
  ]);

  const meta = buildPaginationMeta(totalItems, pagination);

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
            <UserForm />
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">Usuario guardado correctamente.</FlashMessage>
      ) : null}
      {params.error === 'self' ? (
        <FlashMessage type="error">No puedes desactivar tu propia cuenta.</FlashMessage>
      ) : null}

      <Section>
        {users.length ? (
          <DataTable
            headers={[
              'Usuario',
              'Contacto',
              'Rol',
              'Estado',
              'Ultimo acceso',
              'Acciones',
            ]}
          >
            {users.map((user) => (
              <tr key={user.id} className={user.isActive ? '' : 'bg-surface-muted/45'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
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
                <td className="px-4 py-3">{formatDate(user.lastLoginAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <ActionTip label="Editar">
                      <RecordEditModal title="Editar usuario">
                        <UserForm user={user} />
                      </RecordEditModal>
                    </ActionTip>
                    <ActionTip label={user.isActive ? 'Desactivar' : 'Activar'}>
                      <IdActionForm
                        action={setUserActive}
                        className={user.isActive ? iconBtnWarn : iconBtnGood}
                        fields={[
                          {
                            name: 'isActive',
                            value: user.isActive ? 'false' : 'true',
                          },
                        ]}
                        id={user.id}
                        label={user.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {user.isActive ? (
                          <PowerOff aria-hidden="true" data-icon="icon" />
                        ) : (
                          <Power aria-hidden="true" data-icon="icon" />
                        )}
                      </IdActionForm>
                    </ActionTip>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="Sin usuarios" />
        )}
        <PaginationBar {...meta} />
      </Section>
    </div>
  );
}
