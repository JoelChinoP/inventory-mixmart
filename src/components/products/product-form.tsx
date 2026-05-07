import { Plus } from 'lucide-react';

import { Field } from '@/components/forms';
import { SubmitButton } from '@/components/shared';
import { Select } from '@/components/ui/select';
import { productCategoryLabels } from '@/lib/format';
import { getBrands } from '@/services';
import { createProduct, updateProduct } from '@/server/actions';
import type { ProductCategory } from '../../../prisma/generated/client';

const categories: ProductCategory[] = ['SCHOOL_SUPPLIES', 'BAZAAR', 'SNACKS'];

export type ProductFormValues = {
  id: string;
  sku: string | null;
  brandId: string | null;
  name: string;
  description: string | null;
  category: ProductCategory;
  unitName: string;
  purchasePrice: unknown;
  salePrice: unknown;
  minimumStock: unknown;
};

export async function ProductForm({
  product,
}: {
  product?: ProductFormValues;
}) {
  const brands = await getBrands();
  const isEdit = Boolean(product);

  return (
    <form
      action={isEdit ? updateProduct : createProduct}
      className="space-y-3 p-5"
    >
      {isEdit && product ? (
        <input name="id" type="hidden" value={product.id} />
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Informacion basica
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field className="md:col-span-2" label="Nombre">
            <input
              className="input"
              defaultValue={product?.name}
              name="name"
              placeholder="Ej. Cuaderno A4 cuadriculado"
              required
            />
          </Field>
          <Field label="Categoria">
            <Select
              defaultValue={product?.category ?? 'SCHOOL_SUPPLIES'}
              name="category"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {productCategoryLabels[item]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Marca">
            <Select defaultValue={product?.brandId ?? ''} name="brandId">
              <option value="">Sin marca</option>
              {brands.map(
                (brand: { id: string; name: string; code: string }) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Unidad">
            <input
              className="input"
              defaultValue={product?.unitName ?? 'unidad'}
              name="unitName"
              placeholder="unidad, paquete, kg..."
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Identificacion
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Codigo">
            <input
              className="input"
              defaultValue={product?.sku ?? ''}
              name="sku"
              placeholder="Se genera automaticamente si lo dejas vacio"
            />
          </Field>
          <Field label="Descripcion">
            <input
              className="input"
              defaultValue={product?.description ?? ''}
              name="description"
              placeholder="Detalles, presentacion, etc."
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Precios e inventario
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Costo de compra">
            <input
              className="input"
              defaultValue={product?.purchasePrice?.toString() ?? '0'}
              min="0"
              name="purchasePrice"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
            />
          </Field>
          <Field label="Venta sugerida">
            <input
              className="input"
              defaultValue={product?.salePrice?.toString() ?? ''}
              min="0"
              name="salePrice"
              placeholder="Opcional"
              step="0.01"
              type="number"
            />
          </Field>
          <Field label="Stock minimo">
            <input
              className="input"
              defaultValue={product?.minimumStock?.toString() ?? '0'}
              min="0"
              name="minimumStock"
              placeholder="0"
              required
              step="1"
              type="number"
            />
          </Field>
        </div>
        <p className="rounded-control border border-border bg-surface-muted px-3 py-2 text-[11.5px] text-muted-foreground">
          Estos precios se autocompletan al registrar entradas o salidas. Puedes
          ajustarlos en cada operacion sin tocar el catalogo.
        </p>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </SubmitButton>
      </div>
    </form>
  );
}
