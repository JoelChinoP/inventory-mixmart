import { Plus } from 'lucide-react';
import { Suspense } from 'react';

import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { getBrands } from '@/services';
import { ProductForm } from '@/components/products/product-form';
import {
  ProductsList,
  type ProductsSearchParams,
} from '@/components/products/products-list';
import {
  FlashMessage,
  PageHeader,
  TableSkeleton,
} from '@/components/shared';
import { FormModal } from '@/components/ui/modal';
import { productCategoryLabels } from '@/lib/format';
import { requireActiveUser } from '@/lib/auth';
import { canManageCatalog } from '@/lib/permissions';
import type { ProductCategory } from '../../../../prisma/generated/client';

type ProductsPageProps = {
  searchParams: Promise<ProductsSearchParams & { success?: string }>;
};

const categories: ProductCategory[] = ['SCHOOL_SUPPLIES', 'BAZAAR', 'SNACKS'];

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [user, params, brands] = await Promise.all([
    requireActiveUser('/products'),
    searchParams,
    getBrands(),
  ]);
  const canManage = canManageCatalog(user.role);

  const filterKey = `${params.category ?? ''}|${params.brandId ?? ''}|${params.q ?? ''}|${params.status ?? ''}|${params.page ?? ''}|${params.pageSize ?? ''}`;

  const statusOptions = [
    { label: 'Activos', value: 'active' },
    { label: 'Inactivos', value: 'inactive' },
    ...(canManage ? [{ label: 'Eliminados', value: 'deleted' }] : []),
  ];

  return (
    <div className="space-y-3">
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
              <ProductForm />
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
        <SearchFilter label="Buscar" name="q" placeholder="Nombre o codigo" />
        <SelectFilter
          allLabel="Todas"
          label="Categoria"
          name="category"
          options={categories.map((item) => ({
            label: productCategoryLabels[item],
            value: item,
          }))}
        />
        {brands.length > 0 ? (
          <SelectFilter
            allLabel="Todas"
            label="Marca"
            name="brandId"
            options={brands.map((b) => ({ label: b.name, value: b.id }))}
          />
        ) : null}
        <SelectFilter
          allLabel="Todos"
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
