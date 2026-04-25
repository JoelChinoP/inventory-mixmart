import { Search } from "lucide-react";
import { Suspense } from "react";

import {
  EmptyState,
  PageContentSkeleton,
  PageHeader,
  ProductCategoryBadge,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/shared";
import {
  decimalToNumber,
  formatDate,
  formatDecimal,
  movementTypeLabels,
  productCategoryLabels,
} from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ProductCategory } from "../../../../prisma/generated/client";

type StockPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: ProductCategory;
    status?: "all" | "low" | "out";
  }>;
};

const categories: ProductCategory[] = ["SCHOOL_SUPPLIES", "BAZAAR", "SNACKS"];

export default function StockPage({ searchParams }: StockPageProps) {
  return (
    <div>
      <PageHeader
        title="Stock"
        description="Disponibilidad actual y ultima actividad por producto."
      />
      <Suspense fallback={<PageContentSkeleton />}>
        <StockContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StockContent({ searchParams }: StockPageProps) {
  await requireActiveUser("/stock");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category;
  const status = params.status ?? "all";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      stockMovements: {
        orderBy: { occurredAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 200,
  });

  const filteredProducts = products.filter((product) => {
    const current = decimalToNumber(product.currentStock);
    const minimum = decimalToNumber(product.minimumStock);

    if (status === "out") {
      return current <= 0;
    }

    if (status === "low") {
      return current <= minimum;
    }

    return true;
  });

  return (
    <>
      <Section className="mb-5">
        <SectionHeader title="Filtros" />
        <form className="grid gap-3 p-4 md:grid-cols-[1fr_180px_160px_auto]" action="/stock">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Buscar</span>
            <input className="input" defaultValue={q} name="q" placeholder="Producto" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Categoria</span>
            <select className="input" defaultValue={category ?? ""} name="category">
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {productCategoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Vista</span>
            <select className="input" defaultValue={status} name="status">
              <option value="all">Todo</option>
              <option value="low">Bajo stock</option>
              <option value="out">Sin stock</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              <Search aria-hidden="true" className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </form>
      </Section>

      <Section>
        <SectionHeader title="Inventario actual" />
        {filteredProducts.length ? (
          <div className="overflow-x-auto">
            <table className="table-operational">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
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
                              ? "error"
                              : current <= minimum
                                ? "warning"
                                : "success"
                          }
                        >
                          {current <= 0
                            ? "Sin stock"
                            : current <= minimum
                              ? "Bajo"
                              : "OK"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {latestMovement
                          ? `${movementTypeLabels[latestMovement.movementType]} - ${formatDate(
                              latestMovement.occurredAt,
                            )}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin productos" description="No hay stock con esos filtros." />
        )}
      </Section>
    </>
  );
}
