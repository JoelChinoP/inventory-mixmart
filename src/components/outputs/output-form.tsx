'use client';

import { Plus } from 'lucide-react';

import {
  OutputLineItems,
  type OutputProductOption,
} from '@/components/outputs/output-line-items';
import { SubmitButton } from '@/components/shared';
import { createStockOutput } from '@/server/actions';

type OutputFormProps = {
  products: OutputProductOption[];
};

export function OutputForm({ products }: OutputFormProps) {
  return (
    <form action={createStockOutput} className="space-y-3 p-4 md:p-5">
      <OutputLineItems products={products} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end">
        <SubmitButton className="btn btn-primary sm:w-auto">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Registrar salida
        </SubmitButton>
      </div>
    </form>
  );
}
