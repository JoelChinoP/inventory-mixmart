import { Pencil, Plus, RotateCcw } from 'lucide-react';
import { Fragment, Suspense } from 'react';

import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  EmptyState,
  FlashMessage,
  PageHeader,
  ProductCategoryBadge,
  Section,
  StatusBadge,
  SubmitButton,
  TableSkeleton,
} from '@/components/shared';
import { FormModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  decimalToNumber,
  formatCurrency,
  formatDecimal,
  productCategoryLabels,
} from '@/lib/format';
import { requireActiveUser } from '@/lib/auth';
import { canManageCatalog } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import {
  createProduct,
  deactivateProduct,
  reactivateProduct,
  restoreProduct,
  softDeleteProduct,
  updateProduct,
} from '@/server/actions';
import type { ProductCategory } from '../../../../prisma/generated/client';

type ProductsSearchParams = {
  q?: string;
  category?: ProductCategory;
  status?: 'active' | 'inactive' | 'deleted';
  success?: string;
};

type ProductsPageProps = {
  searchParams: Promise<ProductsSearchParams>;
};

const categories: ProductCategory[] = ['SCHOOL_SUPPLIES', 'BAZAAR', 'SNACKS'];

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await requireActiveUser('/products');
  const params = await searchParams;
  const canManage = canManageCatalog(user.role);

  const filterKey = JSON.stringify({
    category: params.category ?? '',
    q: params.q ?? '',
    status: params.status ?? '',
  });

  const statusOptions = [
    { label: 'Activos', value: 'active' },
    { label: 'Inactivos', value: 'inactive' },
    ...(canManage ? [{ label: 'Eliminados', value: 'deleted' }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        action={
          canManage ? (
            <FormModal
              size="lg"
              title="Nuevo producto"
              description="Define los datos basicos y de inventario."
              trigger={
                <>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Nuevo producto
                </>
              }
            >
              <ProductFormBody />
            </FormModal>
          ) : null
        }
      />

      {params.success ? (
        <FlashMessage type="success">
          Producto guardado correctamente.
        </FlashMessage>
      ) : null}

      <FilterBar>
        <SearchFilter label="Buscar" name="q" placeholder="Nombre, SKU o codigo" />
        <SelectFilter
          allLabel="Todas"
          label="Categoria"
          name="category"
          options={categories.map((item) => ({
            label: productCategoryLabels[item],
            value: item,
          }))}
        />
        <SelectFilter
          allLabel="Activos"
          label="Estado"
          name="status"
          options={statusOptions}
        />
      </FilterBar>

      <Suspense
        fallback={<TableSkeleton columns={6} rows={6} />}
        key={filterKey}
      >
        <ProductsList canManage={canManage} role={user.role} searchParams={params} />
      </Suspense>
    </div>
  );
}

async function ProductsList({
  canManage,
  role,
  searchParams,
}: {
  canManage: boolean;
  role: 'ADMIN' | 'WORKER';
  searchParams: ProductsSearchParams;
}) {
  const q = searchParams.q?.trim() ?? '';
  const category = searchParams.category;
  const status = searchParams.status ?? 'active';

  const products = await prisma.product.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(status === 'inactive'
        ? { isActive: false }
        : status === 'deleted'
          ? { deletedAt: { not: null } }
          : { isActive: true }),
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    take: 100,
  });

  return (
    <Section>
      {products.length ? (
        <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="table-operational-head">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Minimo</th>
                  {role === 'ADMIN' ? (
                    <th className="px-4 py-3">Costo</th>
                  ) : null}
                  {role === 'ADMIN' ? (
                    <th className="px-4 py-3">Venta sug.</th>
                  ) : null}
                  <th className="px-4 py-3">Estado</th>
                  {canManage ? <th className="px-4 py-3">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <Fragment key={product.id}>
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku || product.barcode || product.unitName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ProductCategoryBadge category={product.category} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={stockTone(product)}>
                          {formatDecimal(product.currentStock, 3)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimal(product.minimumStock, 3)}
                      </td>
                      {role === 'ADMIN' ? (
                        <td className="px-4 py-3">
                          {formatCurrency(product.purchasePrice)}
                        </td>
                      ) : null}
                      {role === 'ADMIN' ? (
                        <td className="px-4 py-3">
                          {product.salePrice
                            ? formatCurrency(product.salePrice)
                            : '-'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {product.deletedAt ? (
                          <StatusBadge tone="muted">Eliminado</StatusBadge>
                        ) : product.isActive ? (
                          <StatusBadge tone="success">Activo</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Inactivo</StatusBadge>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {product.deletedAt ? (
                              <form action={restoreProduct}>
                                <input
                                  name="id"
                                  type="hidden"
                                  value={product.id}
                                />
                                <SubmitButton className="btn btn-secondary">
                                  <RotateCcw
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />
                                  Restaurar
                                </SubmitButton>
                              </form>
                            ) : (
                              <>
                                <FormModal
                                  size="lg"
                                  title="Editar producto"
                                  description="Actualiza datos y precios."
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
                                  <ProductFormBody product={product} />
                                </FormModal>
                                <form
                                  action={
                                    product.isActive
                                      ? deactivateProduct
                                      : reactivateProduct
                                  }
                                >
                                  <input
                                    name="id"
                                    type="hidden"
                                    value={product.id}
                                  />
                                  <SubmitButton className="btn btn-ghost border border-border">
                                    {product.isActive
                                      ? 'Desactivar'
                                      : 'Activar'}
                                  </SubmitButton>
                                </form>
                                <form action={softDeleteProduct}>
                                  <input
                                    name="id"
                                    type="hidden"
                                    value={product.id}
                                  />
                                  <SubmitButton className="btn btn-ghost border border-border">
                                    Ocultar
                                  </SubmitButton>
                                </form>
                              </>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
        </div>
      ) : (
        <EmptyState
          title="Sin productos"
          description="No hay productos con esos filtros."
        />
      )}
    </Section>
  );
}

function stockTone(product: { currentStock: unknown; minimumStock: unknown }) {
  const current = decimalToNumber(product.currentStock as never);
  const minimum = decimalToNumber(product.minimumStock as never);

  if (current <= 0) {
    return 'error';
  }

  if (current <= minimum) {
    return 'warning';
  }

  return 'success';
}

function ProductFormBody({
  product,
}: {
  product?: {
    id: string;
    sku: string | null;
    barcode: string | null;
    name: string;
    description: string | null;
    category: ProductCategory;
    unitName: string;
    purchasePrice: unknown;
    salePrice: unknown;
    minimumStock: unknown;
  };
}) {
  const isEdit = Boolean(product);

  return (
    <form
      action={isEdit ? updateProduct : createProduct}
      className="grid gap-4 p-6 md:grid-cols-3"
    >
      {isEdit && product ? (
        <input name="id" type="hidden" value={product.id} />
      ) : null}
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Nombre
        </span>
        <input
          className="input"
          defaultValue={product?.name}
          name="name"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Categoria
        </span>
        <Select
          defaultValue={product?.category ?? 'SCHOOL_SUPPLIES'}
          name="category"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {productCategoryLabels[item]}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">SKU</span>
        <input className="input" defaultValue={product?.sku ?? ''} name="sku" />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Codigo barras
        </span>
        <input
          className="input"
          defaultValue={product?.barcode ?? ''}
          name="barcode"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Unidad
        </span>
        <input
          className="input"
          defaultValue={product?.unitName ?? 'unidad'}
          name="unitName"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Costo ref.
        </span>
        <input
          className="input"
          defaultValue={product?.purchasePrice?.toString() ?? '0'}
          min="0"
          name="purchasePrice"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Venta sugerida
        </span>
        <input
          className="input"
          defaultValue={product?.salePrice?.toString() ?? ''}
          min="0"
          name="salePrice"
          step="0.01"
          type="number"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Stock minimo
        </span>
        <input
          className="input"
          defaultValue={product?.minimumStock?.toString() ?? '0'}
          min="0"
          name="minimumStock"
          required
          step="0.001"
          type="number"
        />
      </label>
      <label className="space-y-1.5 md:col-span-3">
        <span className="text-xs font-semibold text-muted-foreground">
          Descripcion
        </span>
        <textarea
          className="input min-h-24 py-2"
          defaultValue={product?.description ?? ''}
          name="description"
        />
      </label>
      <div className="flex justify-end md:col-span-3">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </SubmitButton>
      </div>
    </form>
  );
}
