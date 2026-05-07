import { Plus } from "lucide-react";

import { EntryLineItems, type EntryProductOption } from "@/components/entries/entry-line-items";
import { Field, ProductCombobox } from "@/components/forms";
import { SubmitButton } from "@/components/shared";
import { Select } from "@/components/ui/select";
import { createStockEntry } from "@/server/actions";

type SupplierOption = {
  id: string;
  name: string;
};

export function EntryForm({
  suppliers,
  products,
}: {
  suppliers: SupplierOption[];
  products: EntryProductOption[];
}) {
  return (
    <form action={createStockEntry} className="space-y-3 p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Field className="md:col-span-2" label="Proveedor">
          <ProductCombobox
            ariaLabel="Proveedor"
            name="supplierId"
            options={suppliers.map((supplier) => ({
              id: supplier.id,
              name: supplier.name,
            }))}
            placeholder="Buscar proveedor..."
            required
          />
        </Field>
        <Field label="Estado">
          <Select defaultValue="ORDERED" name="status">
            <option value="ORDERED">Ordenada</option>
            <option value="RECEIVED">Recibida</option>
          </Select>
        </Field>
        <Field label="Referencia">
          <input className="input" name="referenceNumber" placeholder="N de orden" />
        </Field>
      </div>

      <EntryLineItems products={products} />

      <div className="flex justify-end">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Registrar entrada
        </SubmitButton>
      </div>
    </form>
  );
}
