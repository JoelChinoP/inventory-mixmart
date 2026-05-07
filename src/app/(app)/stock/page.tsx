import { Suspense } from 'react';

import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { TableSkeleton } from '@/components/shared';
import { StockTable } from '@/components/stock/stock-table';
import { productCategoryLabels } from '@/lib/format';
import { requireActiveUser } from '@/lib/auth';
import type { ProductCategory } from '../../../../prisma/generated/client';

type StockSearchParams = {
  q?: string;
  category?: ProductCategory;
  status?: 'all' | 'low' | 'out';
  page?: string;
  pageSize?: string;
};

type StockPageProps = {
  searchParams: Promise<StockSearchParams>;
};

const categories: ProductCategory[] = ['SCHOOL_SUPPLIES', 'BAZAAR', 'SNACKS'];

export default async function StockPage({ searchParams }: StockPageProps) {
  await requireActiveUser('/stock');
  const params = await searchParams;

  const filterKey = `${params.q ?? ''}|${params.category ?? ''}|${params.status ?? ''}|${params.page ?? ''}|${params.pageSize ?? ''}`;

  return (
    <div className="space-y-3">
      <Suspense
        fallback={<TableSkeleton columns={7} rows={6} />}
        key={filterKey}
      >
        <StockTable
          filters={
            <FilterBar>
              <SearchFilter label="Buscar" name="q" placeholder="Producto" />
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
                allLabel="Todo"
                label="Vista"
                name="status"
                options={[
                  { label: 'Bajo stock', value: 'low' },
                  { label: 'Sin stock', value: 'out' },
                ]}
              />
            </FilterBar>
          }
          params={params}
        />
      </Suspense>
    </div>
  );
}
