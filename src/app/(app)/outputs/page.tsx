import { Plus } from "lucide-react";
import { Suspense } from "react";

import {
  DateRangeFilter,
  FilterBar,
  SelectFilter,
} from "@/components/filters";
import { OutputForm } from "@/components/outputs/output-form";
import {
  OutputsList,
  type OutputsSearchParams,
} from "@/components/outputs/outputs-list";
import {
  FlashMessage,
  PageContentSkeleton,
  PageHeader,
} from "@/components/shared";
import { FormModal } from "@/components/ui/modal";
import { formatDecimal } from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type OutputsPageProps = {
  searchParams: Promise<
    OutputsSearchParams & { success?: string; error?: string }
  >;
};

export default async function OutputsPage({ searchParams }: OutputsPageProps) {
  const [, params, products] = await Promise.all([
    requireActiveUser("/outputs"),
    searchParams,
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        unitName: true,
        currentStock: true,
        salePrice: true,
        brand: { select: { name: true } },
      },
      take: 300,
    }),
  ]);

  const filterKey = `${params.from ?? ""}|${params.to ?? ""}|${params.reason ?? ""}|${params.page ?? ""}|${params.pageSize ?? ""}`;

  return (
    <div className="space-y-3">
      <PageHeader
        action={
          <FormModal
            size="xl"
            title="Nueva salida"
            description="Registra ventas, mermas o uso interno."
            trigger={
              <>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva salida
              </>
            }
          >
            <OutputForm
              products={products.map((product) => ({
                id: product.id,
                name: product.name,
                category: product.category,
                unitName: product.unitName,
                currentStock: formatDecimal(product.currentStock, 3),
                salePrice: product.salePrice
                  ? formatDecimal(product.salePrice, 2)
                  : null,
                brandName: product.brand?.name ?? null,
              }))}
            />
          </FormModal>
        }
      />

      {params.success ? (
        <FlashMessage type="success">Salida registrada correctamente.</FlashMessage>
      ) : null}
      {params.error === "stock" ? (
        <FlashMessage type="error">
          Stock insuficiente para completar la salida.
        </FlashMessage>
      ) : null}

      <Suspense fallback={<PageContentSkeleton />} key={filterKey}>
        <OutputsList
          filters={
            <FilterBar>
              <DateRangeFilter label="Periodo de salida" />
              <SelectFilter
                allLabel="Todos"
                label="Motivo"
                name="reason"
                options={[
                  { label: "Venta", value: "SALE" },
                  { label: "Merma", value: "WASTE" },
                  { label: "Uso interno", value: "INTERNAL_USE" },
                ]}
              />
            </FilterBar>
          }
          searchParams={params}
        />
      </Suspense>
    </div>
  );
}
