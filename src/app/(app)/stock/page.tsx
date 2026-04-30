import { Suspense } from 'react';

import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  EmptyState,
  ProductCategoryBadge,
  Section,
  StatusBadge,
  TableSkeleton,
} from '@/components/shared';
import {
  decimalToNumber,
  formatDate,
  formatDecimal,
  movementTypeLabels,
  productCategoryLabels,
} from '@/lib/format';
import { requireActiveUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { ProductCategory } from '../../../../prisma/generated/client';

type StockSearchParams = {
  q?: string;
  category?: ProductCategory;
  status?: 'all' | 'low' | 'out';
};

type StockPageProps = {
  searchParams: Promise<StockSearchParams>;
};

const categories: ProductCategory[] = ['SCHOOL_SUPPLIES', 'BAZAAR', 'SNACKS'];

export default async function StockPage({ searchParams }: StockPageProps) {
  await requireActiveUser('/stock');
  const params = await searchParams;

  const filterKey = JSON.stringify({
    category: params.category ?? '',
    q: params.q ?? '',
    status: params.status ?? '',
  });

  return (
    <div className="space-y-5">
      <FilterBar>
        <SearchFilter
          className="xl:col-span-2"
          label="Buscar"
          name="q"
          placeholder="Producto"
        />
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

      <Suspense
        fallback={<TableSkeleton columns={7} rows={6} />}
        key={filterKey}
      >
        <StockList searchParams={params} />
      </Suspense>
    </div>
  );
}

async function StockList({ searchParams }: { searchParams: StockSearchParams }) {
  const q = searchParams.q?.trim() ?? '';
  const category = searchParams.category;
  const status = searchParams.status ?? 'all';

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      stockMovements: {
        orderBy: { occurredAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: 200,
  });

  const filteredProducts = products.filter((product) => {
    const current = decimalToNumber(product.currentStock);
    const minimum = decimalToNumber(product.minimumStock);

    if (status === 'out') {
      return current <= 0;
    }

    if (status === 'low') {
      return current <= minimum;
    }

    return true;
  });

  return (
    <Section>
      {filteredProducts.length ? (
        <div className="overflow-x-auto">
          <table className="table-operational">
            <thead className="table-operational-head">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Minimo</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ultimo movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => {
                const current = decimalToNumber(product.currentStock);
                const minimum = decimalToNumber(product.minimumStock);
                const latestMovement = product.stockMovements[0];

                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {product.name}
                    </td>
                    <td className="px-4 py-3">
                      <ProductCategoryBadge category={product.category} />
                    </td>
                    <td className="px-4 py-3">
                      {formatDecimal(product.currentStock, 3)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDecimal(product.minimumStock, 3)}
                    </td>
                    <td className="px-4 py-3">{product.unitName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          current <= 0
                            ? 'error'
                            : current <= minimum
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {current <= 0
                          ? 'Sin stock'
                          : current <= minimum
                            ? 'Bajo'
                            : 'OK'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {latestMovement
                        ? `${movementTypeLabels[latestMovement.movementType]} - ${formatDate(
                            latestMovement.occurredAt,
                          )}`
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Sin productos"
          description="No hay stock con esos filtros."
        />
      )}
    </Section>
  );
}
