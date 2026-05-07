import {
  FilterBar,
  SearchFilter,
  SelectFilter,
  DateRangeFilter,
} from "@/components/filters";
import { EntriesList, type EntriesSearchParams } from "./entries-list";
import prisma from "@/lib/prisma";

export async function EntriesSection({
  searchParams,
}: {
  searchParams: EntriesSearchParams;
}) {
  const [suppliers] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 200,
    }),
  ]);

  const supplierOptions = suppliers.map((supplier) => ({
    label: supplier.name,
    value: supplier.id,
  }));

  return (
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
              { label: "Ordenada", value: "ORDERED" },
              { label: "Recibida", value: "RECEIVED" },
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
      searchParams={searchParams}
    />
  );
}
