"use client";

import { SlidersHorizontal, TriangleAlert } from "lucide-react";

import { Field } from "@/components/forms";
import { CurrentUrlField, SubmitButton } from "@/components/shared";
import { iconBtnWarn } from "@/components/shared/record-action-styles";
import { FormModal } from "@/components/ui/modal";
import { adjustStock } from "@/server/actions";

export function StockAdjustmentModal({
  productId,
  productName,
  currentStock,
}: {
  productId: string;
  productName: string;
  currentStock: number;
}) {
  return (
    <FormModal
      closeOnOverlayClick={false}
      description={`Corrección directa de inventario: ${productName}`}
      size="sm"
      title="Ajuste de stock"
      trigger={<SlidersHorizontal aria-hidden="true" data-icon="icon" />}
      triggerAriaLabel="Ajustar stock"
      triggerClassName={iconBtnWarn}
    >
      <form action={adjustStock} className="space-y-4 p-5">
        <CurrentUrlField />
        <input name="productId" type="hidden" value={productId} />

        <div className="flex gap-2.5 rounded-control border border-warning/40 bg-warning-surface px-3 py-2.5 text-sm text-warning">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>
            Este ajuste modifica el inventario directamente y queda registrado
            en el historial. Úsalo solo para correcciones de conteo físico.
          </p>
        </div>

        <div className="rounded-control border border-border bg-surface-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Stock actual: </span>
          <span className="font-semibold text-foreground">{currentStock}</span>
        </div>

        <Field label="Nuevo stock">
          <input
            className="input"
            defaultValue={currentStock}
            min="0"
            name="newStock"
            required
            step="any"
            type="number"
          />
        </Field>

        <Field label="Motivo (opcional)">
          <input
            className="input"
            name="notes"
            placeholder="Ej. Corrección de conteo físico"
          />
        </Field>

        <div className="flex justify-end">
          <SubmitButton>Aplicar ajuste</SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}
