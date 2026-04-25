"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/components/shared";
import { createStockOutput } from "@/server/actions";

type ProductOption = {
  id: string;
  name: string;
  unitName: string;
  currentStock: string;
  salePrice: string | null;
};

type OutputFormProps = {
  products: ProductOption[];
};

export function OutputForm({ products }: OutputFormProps) {
  const [reason, setReason] = useState("SALE");
  const isSale = reason === "SALE";

  return (
    <form action={createStockOutput} className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Motivo</span>
          <select
            className="input"
            name="reason"
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          >
            <option value="SALE">Venta</option>
            <option value="WASTE">Merma</option>
            <option value="INTERNAL_USE">Uso interno</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Notas</span>
          <input className="input" name="notes" />
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Cantidad</th>
              {isSale ? <th className="px-3 py-2">Precio venta real</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <tr key={index}>
                <td className="px-3 py-2">
                  <select className="input" name="productId">
                    <option value="">Seleccionar</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.currentStock} {product.unitName})
                        {isSale && product.salePrice ? ` - S/ ${product.salePrice}` : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input"
                    min="0.001"
                    name="quantity"
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

      <SubmitButton>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Registrar salida
      </SubmitButton>
    </form>
  );
}
