'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  Field,
  ProductCombobox,
  type ProductComboboxOption,
} from '@/components/forms';
import { SubmitButton } from '@/components/shared';
import { Select } from '@/components/ui/select';
import { serviceKindLabels } from '@/lib/format';
import { cn } from '@/lib/utils';
import { createServiceRecord } from '@/server/actions';
import type { ServiceKind } from '../../../prisma/generated/client';

type ServiceTypeOption = {
  id: string;
  name: string;
  kind: ServiceKind;
};

type ConsumptionProductOption = {
  id: string;
  name: string;
  unitName: string;
  currentStock: string;
  brandName: string | null;
};

type ConsumptionRow = {
  rowId: number;
  productId: string;
  quantity: string;
};

let nextRowId = 0;
const newConsumptionRow = (): ConsumptionRow => ({
  rowId: ++nextRowId,
  productId: '',
  quantity: '',
});

function dateTimeLocalValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function ServiceRecordForm({
  serviceTypes,
  products,
}: {
  serviceTypes: ServiceTypeOption[];
  products: ConsumptionProductOption[];
}) {
  const [rows, setRows] = useState<ConsumptionRow[]>(() => []);

  const productOptions: ProductComboboxOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    unitName: product.unitName,
    hint: product.brandName ?? undefined,
    currentStock: `Stock: ${product.currentStock} ${product.unitName}`,
  }));

  const addRow = () => setRows((current) => [...current, newConsumptionRow()]);
  const removeRow = (rowId: number) =>
    setRows((current) => current.filter((row) => row.rowId !== rowId));
  const updateRow = (rowId: number, patch: Partial<ConsumptionRow>) =>
    setRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );

  return (
    <form action={createServiceRecord} className="space-y-3 p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Field className="md:col-span-2" label="Tipo de servicio">
          <ProductCombobox
            ariaLabel="Tipo de servicio"
            name="serviceTypeId"
            options={serviceTypes.map((type) => ({
              id: type.id,
              name: type.name,
              hint: serviceKindLabels[type.kind],
            }))}
            placeholder="Buscar servicio..."
            required
          />
        </Field>
        <Field label="Estado">
          <Select defaultValue="RECEIVED" name="status">
            <option value="RECEIVED">Recibido</option>
            <option value="IN_PROGRESS">En proceso</option>
            <option value="COMPLETED">Completado</option>
            <option value="DELIVERED">Entregado</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </Field>
        <Field label="Cantidad">
          <input
            className="input"
            defaultValue="1"
            min="1"
            name="quantity"
            required
            step="1"
            type="number"
          />
        </Field>
        <Field label="Fecha servicio">
          <input
            className="input"
            defaultValue={dateTimeLocalValue()}
            name="serviceDate"
            required
            type="datetime-local"
          />
        </Field>
        <Field label="Fecha entrega">
          <input className="input" name="deliveredAt" type="datetime-local" />
        </Field>
        <Field className="md:col-span-2" label="Proveedor externo (opcional)">
          <input
            className="input"
            name="externalVendorName"
            placeholder="Nombre del proveedor si es tercerizado"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-soft h-9 px-3 text-xs"
          onClick={addRow}
          type="button"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>

      <div className="rounded-card border border-border">
        {rows.length ? (
          <div className="divide-y divide-border">
            {rows.map((row, index) => (
              <div
                className={cn(
                  'grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end',
                )}
                key={row.rowId}
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    #{index + 1} Producto
                  </span>
                  <ProductCombobox
                    ariaLabel={`Insumo ${index + 1}`}
                    name="supplyProductId"
                    onSelect={(option) =>
                      updateRow(row.rowId, { productId: option?.id ?? '' })
                    }
                    options={productOptions}
                    placeholder="Buscar insumo..."
                  />
                </div>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Cantidad
                  </span>
                  <input
                    className="input"
                    min="1"
                    name="supplyQuantity"
                    onChange={(event) =>
                      updateRow(row.rowId, { quantity: event.target.value })
                    }
                    placeholder="0"
                    step="1"
                    type="number"
                    value={row.quantity}
                  />
                </label>
                <button
                  aria-label="Quitar insumo"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-border text-muted-foreground transition hover:border-error/40 hover:bg-error-surface hover:text-error"
                  onClick={() => removeRow(row.rowId)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            Sin insumos. Si el servicio no consume productos del inventario,
            dejalo vacio.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Registrar servicio
        </SubmitButton>
      </div>
    </form>
  );
}
