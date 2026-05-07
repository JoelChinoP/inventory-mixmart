'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Select } from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination';

type PaginationBarProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
};

export function PaginationBar({
  page,
  pageSize,
  totalPages,
  totalItems,
  start,
  end,
}: PaginationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const navigate = (next: URLSearchParams) => {
    const query = next.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(nextPage));
    }
    navigate(next);
  };

  const setPageSize = (size: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('pageSize', String(size));
    next.delete('page');
    navigate(next);
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>
          {totalItems > 0
            ? `${start}-${end} de ${totalItems}`
            : 'Sin resultados'}
        </span>
        {pending ? (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Mostrar</span>
          <Select
            aria-label="Filas por pagina"
            className="h-8 min-h-8 w-20 px-2 py-0 text-xs"
            onValueChange={(next) => setPageSize(Number(next))}
            value={String(pageSize)}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <button
            aria-label="Pagina anterior"
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-border bg-surface-elevated text-muted-foreground transition hover:border-primary-300 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canPrev || pending}
            onClick={() => setPage(page - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="min-w-[64px] text-center font-medium text-foreground">
            {page} / {totalPages}
          </span>
          <button
            aria-label="Pagina siguiente"
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-border bg-surface-elevated text-muted-foreground transition hover:border-primary-300 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canNext || pending}
            onClick={() => setPage(page + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
