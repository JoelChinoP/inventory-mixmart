import { Plus } from 'lucide-react';

import { Field } from '@/components/forms';
import { SubmitButton } from '@/components/shared';
import { createSupplier, updateSupplier } from '@/server/actions';

export type SupplierFormValues = {
  id: string;
  ruc: string;
  name: string;
  phone: string;
  contactName: string;
  address: string | null;
  notes: string | null;
};

export function SupplierForm({ supplier }: { supplier?: SupplierFormValues }) {
  const isEdit = Boolean(supplier);

  return (
    <form
      action={isEdit ? updateSupplier : createSupplier}
      className="space-y-3 p-5"
    >
      {isEdit && supplier ? (
        <input name="id" type="hidden" value={supplier.id} />
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Datos de la empresa
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="RUC">
            <input
              className="input"
              defaultValue={supplier?.ruc}
              name="ruc"
              placeholder="20XXXXXXXXX"
              required
            />
          </Field>
          <Field className="md:col-span-2" label="Razon social">
            <input
              className="input"
              defaultValue={supplier?.name}
              name="name"
              placeholder="Nombre de la empresa"
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Contacto
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Telefono">
            <input
              className="input"
              defaultValue={supplier?.phone}
              name="phone"
              placeholder="+51 9XX XXX XXX"
              required
            />
          </Field>
          <Field className="md:col-span-2" label="Persona de contacto">
            <input
              className="input"
              defaultValue={supplier?.contactName}
              name="contactName"
              placeholder="Nombre y apellido"
              required
            />
          </Field>
        </div>
        <Field label="Direccion">
          <input
            className="input"
            defaultValue={supplier?.address ?? ''}
            name="address"
            placeholder="Av., calle, distrito"
          />
        </Field>
      </fieldset>

      {/* <Field label="Notas">
        <textarea
          className="input min-h-20 py-2"
          defaultValue={supplier?.notes ?? ""}
          name="notes"
          placeholder="Condiciones de pago, observaciones..."
        />
      </Field> */}

      <div className="flex justify-end">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
        </SubmitButton>
      </div>
    </form>
  );
}
