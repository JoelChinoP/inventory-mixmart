import { Plus } from 'lucide-react';
import { Suspense } from 'react';

import { EntryForm } from '@/components/entries/entry-form';
import {
  EntriesList,
  type EntriesSearchParams,
} from '@/components/entries/entries-list';
import {
  DateRangeFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from '@/components/filters';
import { FlashMessage, PageHeader, TableSkeleton } from '@/components/shared';
import { FormModal } from '@/components/ui/modal';
import { requireActiveUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

type EntriesPageProps = {
  searchParams: Promise<EntriesSearchParams & { success?: string }>;
};

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const [, params, suppliers, productsRaw] = await Promise.all([
    requireActiveUser('/entries'),
    searchParams,
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unitName: true,
        category: true,
        purchasePrice: true,
      },
      take: 1000,
    }),
  ]);

  const products = productsRaw.map((product) => ({
    id: product.id,
    name: product.name,
    unitName: product.unitName,
    category: product.category,
    purchasePrice: product.purchasePrice ? String(product.purchasePrice) : null,
  }));

  const supplierOptions = suppliers.map((supplier) => ({
    label: supplier.name,
    value: supplier.id,
  }));

  const filterKey = `${params.from ?? ''}|${params.to ?? ''}|${params.q ?? ''}|${params.status ?? ''}|${params.supplierId ?? ''}|${params.page ?? ''}|${params.pageSize ?? ''}`;

  return (
    <div className="space-y-3">
      <PageHeader
        action={
          <FormModal
            size="xl"
            title="Nueva entrada"
            description="Registra una orden o recepcion de mercaderia."
            trigger={
              <>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva entrada
              </>
            }
          >
            <EntryForm products={products} suppliers={suppliers} />
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">
          Entrada registrada correctamente.
        </FlashMessage>
      ) : null}

      <Suspense
        fallback={<TableSkeleton columns={7} rows={6} />}
        key={filterKey}
      >
        <EntriesList
          filters={
            <FilterBar>
              <DateRangeFilter label="Periodo de orden" />
              <SearchFilter
                label="Referencia"
                name="q"
                placeholder="Numero o codigo"
              />
              <SelectFilter
                allLabel="Todos"
                label="Estado"
                name="status"
                options={[
                  { label: 'Ordenada', value: 'ORDERED' },
                  { label: 'Recibida', value: 'RECEIVED' },
                ]}
              />
              <SelectFilter
                allLabel="Todos"
                label="Proveedor"
                name="supplierId"
                options={supplierOptions}
              />
            </FilterBar>
          }
          searchParams={params}
        />
      </Suspense>
    </div>
  );
}
