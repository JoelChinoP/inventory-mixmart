'use client';

import {
  BriefcaseBusiness,
  CircleAlert,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  ProductCombobox,
  type ProductComboboxOption,
} from '@/components/forms/product-combobox';
import { productCategoryLabels } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProductCategory } from '../../../prisma/generated/client';

export type OutputProductOption = {
  id: string;
  name: string;
  category: ProductCategory;
  unitName: string;
  currentStock: string;
  salePrice: string | null;
  brandName: string | null;
};

type Reason = 'SALE' | 'WASTE' | 'INTERNAL_USE';

const reasonOptions: {
  value: Reason;
  label: string;
  description: string;
  icon: typeof ShoppingCart;
}[] = [
  { value: 'SALE', label: 'Venta', description: 'Cliente', icon: ShoppingCart },
  {
    value: 'WASTE',
    label: 'Merma',
    description: 'Dañado o perdido',
    icon: CircleAlert,
  },
  {
    value: 'INTERNAL_USE',
    label: 'Uso interno',
    description: 'Consumo propio',
    icon: BriefcaseBusiness,
  },
];

type Row = {
  rowId: number;
  productId: string;
  quantity: string;
  unitSalePrice: string;
};

let nextRowId = 0;
const newRow = (): Row => ({
  rowId: ++nextRowId,
  productId: '',
  quantity: '',
  unitSalePrice: '',
});

export function OutputLineItems({
  products,
}: {
  products: OutputProductOption[];
}) {
  const [reason, setReason] = useState<Reason>('SALE');
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const isSale = reason === 'SALE';

  const options: ProductComboboxOption[] = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        unitName: product.unitName,
        hint: [product.brandName, productCategoryLabels[product.category]].filter(Boolean).join(' · '),
        currentStock: `Stock: ${product.currentStock} ${product.unitName}${
          product.salePrice ? ` - Venta S/ ${product.salePrice}` : ''
        }`,
      })),
    [products],
  );

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
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
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
                    'flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-sm transition active:scale-[0.95]',
                    active
                      ? 'border-primary-300 bg-primary-50 text-primary-800'
                      : 'border-border bg-surface hover:border-primary-200 hover:bg-primary-50/60',
                  )}
                  key={option.value}
                >
                  <input
                    checked={active}
                    className="sr-only"
                    name="reason"
                    onChange={() => setReason(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-control border',
                      active
                        ? 'border-primary-200 bg-primary text-primary-foreground'
                        : 'border-border bg-surface-muted text-muted-foreground',
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
          <span className="text-xs font-medium text-muted-foreground">
            Notas
          </span>
          <textarea
            className="input min-h-14 max-h-14 py-2 mt-1.5"
            name="notes"
            placeholder="Detalle breve para reconocer esta salida"
          />
        </label>
      </div>

      <div className="rounded-card border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
          <h4 className="text-sm font-semibold text-foreground">Productos</h4>
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
              className={cn(
                'grid gap-2 p-3 md:items-end',
                isSale
                  ? 'md:grid-cols-[minmax(0,1fr)_120px_140px_auto]'
                  : 'md:grid-cols-[minmax(0,1fr)_120px_auto]',
              )}
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
                      unitSalePrice:
                        row.unitSalePrice ||
                        (product?.salePrice ? product.salePrice : ''),
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
              {isSale ? (
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Precio venta
                  </span>
                  <input
                    className="input"
                    min="0"
                    name="unitSalePrice"
                    onChange={(event) =>
                      updateRow(row.rowId, {
                        unitSalePrice: event.target.value,
                      })
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={row.unitSalePrice}
                  />
                </label>
              ) : null}
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
    </div>
  );
}
