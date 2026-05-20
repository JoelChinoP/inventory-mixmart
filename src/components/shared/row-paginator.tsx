"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { useLocalPagination } from "@/lib/use-local-pagination";
import { DataTable } from "./data-table";
import { EmptyState, Section } from "./page";

type LocalPaginationBarProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
};

function LocalPaginationBar({
  page,
  totalPages,
  totalItems,
  start,
  end,
  onPageChange,
}: LocalPaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2.5 text-xs">
      <span className="text-muted-foreground">
        {totalItems > 0 ? `${start}-${end} de ${totalItems}` : "Sin resultados"}
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Pagina anterior"
          className="inline-flex size-8 items-center justify-center rounded-[8px] border border-border bg-surface-elevated text-muted-foreground transition hover:border-primary-300 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
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
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type RowPaginatorProps = {
  rows: ReactNode[];
  headers: ReactNode[];
  columnWidths?: string[];
  minWidth?: string;
  containerClassName?: string;
  filters?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  resetKey?: string;
};

export function RowPaginator({
  rows,
  headers,
  columnWidths,
  minWidth,
  containerClassName,
  filters,
  emptyTitle = "Sin resultados",
  emptyDescription,
  pageSize = 20,
  resetKey,
}: RowPaginatorProps) {
  const { pageItems, page, totalPages, totalItems, start, end, setPage } =
    useLocalPagination(rows, pageSize, resetKey);

  return (
    <Section>
      {filters}
      {rows.length === 0 ? (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      ) : (
        <>
          <DataTable
            columnWidths={columnWidths}
            containerClassName={containerClassName}
            headers={headers}
            minWidth={minWidth}
          >
            {pageItems}
          </DataTable>
          <LocalPaginationBar
            end={end}
            onPageChange={setPage}
            page={page}
            start={start}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </>
      )}
    </Section>
  );
}
