import { Plus } from 'lucide-react';
import { Fragment, Suspense } from 'react';

import { SupplierForm } from '@/components/suppliers/supplier-form';
import {
  DataTable,
  EmptyState,
  FlashMessage,
  PageContentSkeleton,
  PageHeader,
  PaginationBar,
  RecordActions,
  RecordEditModal,
  RecordStatusBadge,
  Section,
} from '@/components/shared';
import { FormModal } from '@/components/ui/modal';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { sumLineCost } from '@/lib/calc';
import { requireActiveUser } from '@/lib/auth';
import { buildPaginationMeta, readPagination } from '@/lib/pagination';
import { canManageCatalog } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import {
  deactivateSupplier,
  reactivateSupplier,
  restoreSupplier,
  softDeleteSupplier,
} from '@/server/actions';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';

type SuppliersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: 'active' | 'inactive' | 'deleted';
    success?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default function SuppliersPage({ searchParams }: SuppliersPageProps) {
  return (
    <div>
      <Suspense fallback={<PageContentSkeleton />}>
        <SuppliersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SuppliersContent({ searchParams }: SuppliersPageProps) {
  const user = await requireActiveUser('/suppliers');
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const status = params.status;
  const canManage = canManageCatalog(user.role);
  const pagination = readPagination(params);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { ruc: { contains: q, mode: 'insensitive' as const } },
            { contactName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(status === 'inactive'
      ? { isActive: false }
      : status === 'deleted'
        ? { deletedAt: { not: null } }
        : status === 'active'
          ? { isActive: true }
          : {}),
  };

  const [suppliers, totalItems] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            productSuppliers: true,
            stockEntries: true,
          },
        },
        stockEntries: {
          orderBy: { orderedAt: 'desc' },
          take: 3,
          include: {
            items: { select: { quantity: true, unitCost: true } },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.supplier.count({ where }),
  ]);

  const meta = buildPaginationMeta(totalItems, pagination);

  const headers = [
    'Proveedor',
    'Contacto',
    'Productos',
    'Compras',
    'Estado',
    ...(canManage ? ['Acciones'] : []),
  ];
  const colSpan = canManage ? 6 : 5;

  return (
    <div className="space-y-5">
      <PageHeader
        action={
          canManage ? (
            <FormModal
              size="lg"
              title="Nuevo proveedor"
              description="Registra los datos para vincularlo a entradas y productos."
              trigger={
                <>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Nuevo proveedor
                </>
              }
            >
              <SupplierForm />
            </FormModal>
          ) : null
        }
      />

      {params.success ? (
        <FlashMessage type="success">
          Proveedor guardado correctamente.
        </FlashMessage>
      ) : null}

      <Section>
        <FilterBar>
          <SearchFilter
            label="Buscar"
            name="q"
            placeholder="Nombre, RUC o contacto"
          />

          <SelectFilter
            allLabel="Todos"
            label="Estado"
            name="status"
            options={[
              { label: 'Activos', value: 'active' },
              { label: 'Inactivos', value: 'inactive' },
              ...(canManage ? [{ label: 'Eliminados', value: 'deleted' }] : []),
            ]}
          />
        </FilterBar>
        {suppliers.length ? (
          <DataTable headers={headers}>
            {suppliers.map((supplier) => (
              <Fragment key={supplier.id}>
                <tr>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {supplier.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      RUC {supplier.ruc}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{supplier.contactName}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {supplier._count.productSuppliers}
                  </td>
                  <td className="px-4 py-3">{supplier._count.stockEntries}</td>
                  <td className="px-4 py-3">
                    <RecordStatusBadge
                      deletedAt={supplier.deletedAt}
                      isActive={supplier.isActive}
                    />
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <RecordActions
                        deletedAt={supplier.deletedAt}
                        editTrigger={
                          <RecordEditModal
                            title="Editar proveedor"
                          >
                            <SupplierForm supplier={supplier} />
                          </RecordEditModal>
                        }
                        id={supplier.id}
                        isActive={supplier.isActive}
                        onActivate={reactivateSupplier}
                        onDeactivate={deactivateSupplier}
                        onRestore={restoreSupplier}
                        onSoftDelete={softDeleteSupplier}
                      />
                    </td>
                  ) : null}
                </tr>
                <tr className="bg-surface-muted/45">
                  <td className="px-4 py-3" colSpan={colSpan}>
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-primary">
                        Detalle y compras recientes
                      </summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-control border border-border bg-surface p-3">
                          <p className="text-sm text-muted-foreground">
                            {supplier.address || 'Sin direccion registrada'}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {supplier.notes || 'Sin notas'}
                          </p>
                        </div>
                        <div className="rounded-control border border-border bg-surface p-3">
                          {supplier.stockEntries.length ? (
                            <ul className="space-y-2">
                              {supplier.stockEntries.map((entry) => (
                                <li
                                  className="flex justify-between gap-3 text-sm"
                                  key={entry.id}
                                >
                                  <span>{formatDateOnly(entry.orderedAt)}</span>
                                  <span className="font-medium">
                                    {formatCurrency(sumLineCost(entry.items))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Sin compras recientes.
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              </Fragment>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            title="Sin proveedores"
            description="No hay proveedores con esos filtros."
          />
        )}
        <PaginationBar {...meta} />
      </Section>
    </div>
  );
}
