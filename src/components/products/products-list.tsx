import { ProductForm } from "@/components/products/product-form";
import { StockAdjustmentModal } from "@/components/products/stock-adjustment-modal";
import type { ReactNode } from "react";
import {
  ActionTip,
  ProductCategoryBadge,
  RecordActions,
  RecordEditModal,
  RecordStatusBadge,
  RowPaginator,
  StatusBadge,
} from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDecimal,
} from "@/lib/format";
import prisma from "@/lib/prisma";
import {
  deactivateProduct,
  reactivateProduct,
  restoreProduct,
  softDeleteProduct,
} from "@/server/actions";
import type { ProductCategory } from "../../../prisma/generated/client";

export type ProductsSearchParams = {
  q?: string;
  category?: ProductCategory;
  brandId?: string;
  status?: "active" | "inactive" | "deleted";
};

export async function ProductsList({
  canManage,
  filters,
  role,
  searchParams,
}: {
  canManage: boolean;
  filters?: ReactNode;
  role: "ADMIN" | "WORKER";
  searchParams: ProductsSearchParams;
}) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category;
  const brandId = searchParams.brandId;
  const status = searchParams.status;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(brandId ? { brandId } : {}),
    ...(status === "inactive"
      ? { isActive: false }
      : status === "deleted"
        ? { deletedAt: { not: null } }
        : status === "active"
          ? { isActive: true }
          : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: { brand: { select: { name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const headers = [
    "Producto",
    "Marca",
    "Categoria",
    "Stock",
    "Minimo",
    ...(role === "ADMIN" ? ["Costo", "Venta sug."] : []),
    "Estado",
    ...(canManage ? ["Acciones"] : []),
  ];

  const columnWidths =
    role === "ADMIN"
      ? [
          "19%",
          "9%",
          "12%",
          "9%",
          "9%",
          "9%",
          "9%",
          "8%",
          ...(canManage ? ["16%"] : []),
        ]
      : ["28%", "14%", "18%", "11%", "11%", "10%", ...(canManage ? ["8%"] : [])];

  const rows: ReactNode[] = products.map((product) => {
    const current = decimalToNumber(product.currentStock);
    const minimum = decimalToNumber(product.minimumStock);
    const tone =
      current <= 0 ? "error" : current <= minimum ? "warning" : "success";

    return (
      <tr key={product.id}>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.sku || product.unitName}
          </p>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {product.brand?.name ?? "—"}
        </td>
        <td className="px-4 py-3">
          <ProductCategoryBadge category={product.category} />
        </td>
        <td className="px-4 py-3">
          <StatusBadge tone={tone}>
            {formatDecimal(product.currentStock, 3)}
          </StatusBadge>
        </td>
        <td className="px-4 py-3">
          {formatDecimal(product.minimumStock, 3)}
        </td>
        {role === "ADMIN" ? (
          <td className="px-4 py-3">{formatCurrency(product.purchasePrice)}</td>
        ) : null}
        {role === "ADMIN" ? (
          <td className="px-4 py-3">
            {product.salePrice ? formatCurrency(product.salePrice) : "-"}
          </td>
        ) : null}
        <td className="px-4 py-3">
          <RecordStatusBadge
            deletedAt={product.deletedAt}
            isActive={product.isActive}
          />
        </td>
        {canManage ? (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1">
              {!product.deletedAt ? (
                <ActionTip label="Ajustar stock">
                  <StockAdjustmentModal
                    currentStock={decimalToNumber(product.currentStock)}
                    productId={product.id}
                    productName={product.name}
                  />
                </ActionTip>
              ) : null}
              <RecordActions
                deletedAt={product.deletedAt}
                editTrigger={
                  <RecordEditModal
                    description="Actualiza datos y precios."
                    title="Editar producto"
                  >
                    <ProductForm product={product} />
                  </RecordEditModal>
                }
                id={product.id}
                isActive={product.isActive}
                onActivate={reactivateProduct}
                onDeactivate={deactivateProduct}
                onRestore={restoreProduct}
                onSoftDelete={softDeleteProduct}
              />
            </div>
          </td>
        ) : null}
      </tr>
    );
  });

  const resetKey = [q, category, brandId, status].filter(Boolean).join("|");

  return (
    <RowPaginator
      columnWidths={columnWidths}
      containerClassName="overflow-x-auto"
      emptyDescription="No hay productos con esos filtros."
      emptyTitle="Sin productos"
      filters={filters}
      headers={headers}
      minWidth={role === "ADMIN" ? "1120px" : "860px"}
      resetKey={resetKey}
      rows={rows}
    />
  );
}
