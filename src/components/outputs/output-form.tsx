"use client";

import {
  BriefcaseBusiness,
  CircleAlert,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/components/shared";
import { productCategoryLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createStockOutput } from "@/server/actions";
import type { ProductCategory } from "../../../prisma/generated/client";

type ProductOption = {
  id: string;
  name: string;
  category: ProductCategory;
  unitName: string;
  currentStock: string;
  salePrice: string | null;
};

type OutputFormProps = {
  products: ProductOption[];
};

const categories: ProductCategory[] = ["SCHOOL_SUPPLIES", "BAZAAR", "SNACKS"];
const reasonOptions = [
  {
    value: "SALE",
    label: "Venta",
    description: "Cliente",
    icon: ShoppingCart,
  },
  {
    value: "WASTE",
    label: "Merma",
    description: "Danado o perdido",
    icon: CircleAlert,
  },
  {
    value: "INTERNAL_USE",
    label: "Uso interno",
    description: "Consumo propio",
    icon: BriefcaseBusiness,
  },
] as const;

export function OutputForm({ products }: OutputFormProps) {
  const [reason, setReason] = useState("SALE");
  const isSale = reason === "SALE";

  return (
    <form action={createStockOutput} className="space-y-5 p-4 md:p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            Motivo de salida
          </legend>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {reasonOptions.map((option) => {
              const Icon = option.icon;
              const active = reason === option.value;

              return (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-card border px-3 py-2.5 text-sm transition",
                    active
                      ? "border-primary-300 bg-primary-50 text-primary-800 shadow-sm"
                      : "border-border bg-surface hover:border-primary-200 hover:bg-primary-50/60",
                  )}
                  key={option.value}
                >
                  <input
                    checked={active}
                    className="sr-only"
                    name="reason"
                    onChange={(event) => setReason(event.target.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-card border",
                      active
                        ? "border-primary-200 bg-primary text-primary-foreground"
                        : "border-border bg-surface-muted text-muted-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Notas</span>
          <textarea
            className="input min-h-[104px] py-2"
            name="notes"
            placeholder="Detalle breve para reconocer esta salida"
          />
        </label>
      </div>

      <div className="rounded-card border border-border bg-surface">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Productos a retirar
            </h4>
            <p className="text-xs text-muted-foreground">
              Selecciona hasta 6 lineas de productos.
            </p>
          </div>
          <span className="badge border-primary-200 bg-primary-50 text-primary-700">
            Stock validado
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-operational">
            <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-2">#</th>
                <th className="min-w-[280px] px-3 py-2">Producto</th>
                <th className="min-w-[130px] px-3 py-2">Cantidad</th>
                {isSale ? (
                  <th className="min-w-[160px] px-3 py-2">Precio venta real</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <select className="input" name="productId">
                      <option value="">Seleccionar producto</option>
                      {categories.map((category) => {
                        const categoryProducts = products.filter(
                          (product) => product.category === category,
                        );

                        return categoryProducts.length ? (
                          <optgroup
                            key={category}
                            label={productCategoryLabels[category]}
                          >
                            {categoryProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {product.currentStock}{" "}
                                {product.unitName}
                                {isSale && product.salePrice
                                  ? ` - S/ ${product.salePrice}`
                                  : ""}
                              </option>
                            ))}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      min="0.001"
                      name="quantity"
                      placeholder="0"
                      step="0.001"
                      type="number"
                    />
                  </td>
                  {isSale ? (
                    <td className="px-3 py-2">
                      <input
                        className="input"
                        min="0"
                        name="unitSalePrice"
                        placeholder="S/ 0.00"
                        step="0.01"
                        type="number"
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          La salida actualizara el stock cuando el servidor confirme la operacion.
        </p>
        <SubmitButton className="sm:w-auto">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Registrar salida
        </SubmitButton>
      </div>
    </form>
  );
}
