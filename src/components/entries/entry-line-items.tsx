'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  ProductCombobox,
  type ProductComboboxOption,
} from '@/components/forms/product-combobox';

export type EntryProductOption = {
  id: string;
  name: string;
  unitName: string;
  purchasePrice: string | null;
  category?: string;
};

type Row = {
  rowId: number;
  productId: string;
  quantity: string;
  unitCost: string;
};

let nextRowId = 0;
const newRow = (): Row => ({
  rowId: ++nextRowId,
  productId: '',
  quantity: '',
  unitCost: '',
});

export function EntryLineItems({
  products,
}: {
  products: EntryProductOption[];
}) {
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);

  const options: ProductComboboxOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    unitName: product.unitName,
    hint: product.category,
    currentStock: product.purchasePrice
      ? `Costo ref. S/ ${product.purchasePrice}`
      : undefined,
  }));

  const addRow = () => setRows((current) => [...current, newRow()]);
  const removeRow = (rowId: number) =>
    setRows((current) =>
      current.length > 1
        ? current.filter((row) => row.rowId !== rowId)
        : current,
    );

  const updateRow = (rowId: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );

  return (
    <div className="rounded-card border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Productos</h4>
          <p className="text-[11.5px] text-muted-foreground">
            Agrega los productos que ingresan al stock.
          </p>
        </div>
        <button
          className="btn btn-soft h-9 px-3 text-xs"
          onClick={addRow}
          type="button"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row, index) => (
          <div
            className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-end"
            key={row.rowId}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                #{index + 1} Producto
              </span>
              <ProductCombobox
                ariaLabel={`Producto ${index + 1}`}
                name="productId"
                onSelect={(option) => {
                  const product = option
                    ? products.find((item) => item.id === option.id)
                    : null;
                  updateRow(row.rowId, {
                    productId: option?.id ?? '',
                    unitCost:
                      row.unitCost ||
                      (product?.purchasePrice ? product.purchasePrice : ''),
                  });
                }}
                options={options}
                placeholder="Buscar producto..."
                required
              />
            </div>
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Cantidad
              </span>
              <input
                className="input"
                min="1"
                name="quantity"
                onChange={(event) =>
                  updateRow(row.rowId, { quantity: event.target.value })
                }
                placeholder="0"
                step="1"
                type="number"
                value={row.quantity}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Costo unitario
              </span>
              <input
                className="input"
                min="0"
                name="unitCost"
                onChange={(event) =>
                  updateRow(row.rowId, { unitCost: event.target.value })
                }
                placeholder="0.00"
                step="0.01"
                type="number"
                value={row.unitCost}
              />
            </label>
            <button
              aria-label="Quitar fila"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-border text-muted-foreground transition hover:border-error/40 hover:bg-error-surface hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
              disabled={rows.length === 1}
              onClick={() => removeRow(row.rowId)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
