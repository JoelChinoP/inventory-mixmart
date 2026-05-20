"use client";

import { useEffect, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

export function useLocalPagination<T>(
  items: T[],
  pageSize = DEFAULT_PAGE_SIZE,
  resetKey?: string,
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return {
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    totalPages,
    totalItems,
    start,
    end,
    setPage,
  };
}
