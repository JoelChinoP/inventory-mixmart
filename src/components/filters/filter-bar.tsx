"use client";

import { ListFilter, RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  type ReactNode,
} from "react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { DateRangePicker } from "./date-range-picker";

type ParamValue = string | undefined;

type FilterContextValue = {
  pending: boolean;
  setParam: (key: string, value: ParamValue) => void;
  setMany: (entries: Record<string, ParamValue>) => void;
  values: Record<string, string>;
};

const FilterContext = createContext<FilterContextValue | null>(null);

function useFilterContext(component: string) {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error(`${component} must be used within <FilterBar>`);
  }
  return context;
}

type FilterBarProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  scrollKey?: string;
};

export function FilterBar({
  children,
  className,
  contentClassName,
  title = "Filtros",
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const values = useMemo(() => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchParams]);

  const replace = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router],
  );

  const setParam = useCallback(
    (key: string, value: ParamValue) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      replace(next);
    },
    [searchParams, replace],
  );

  const setMany = useCallback(
    (entries: Record<string, ParamValue>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(entries).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      replace(next);
    },
    [searchParams, replace],
  );

  const contextValue = useMemo<FilterContextValue>(
    () => ({ pending: isPending, setParam, setMany, values }),
    [isPending, setParam, setMany, values],
  );

  const hasActiveFilters = Object.keys(values).some(
    (key) => values[key] && key !== "success" && key !== "error",
  );

  return (
    <FilterContext.Provider value={contextValue}>
      <section
        className={cn(
          "overflow-hidden rounded-card border border-border bg-surface-elevated shadow-soft",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary">
              <ListFilter aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            {title}
            {isPending ? (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
              />
            ) : null}
          </div>
          {hasActiveFilters ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-error/30 hover:bg-error-surface hover:text-error"
              onClick={() => {
                const preserved = new URLSearchParams();
                ["success", "error"].forEach((key) => {
                  const value = values[key];
                  if (value) preserved.set(key, value);
                });
                replace(preserved);
              }}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Limpiar
            </button>
          ) : null}
        </div>
        <div
          className={cn(
            "grid gap-x-3 gap-y-2.5 bg-surface px-4 py-3 sm:px-5 sm:py-4 md:grid-cols-2 xl:grid-cols-4",
            contentClassName,
          )}
        >
          {children}
        </div>
      </section>
    </FilterContext.Provider>
  );
}

type FieldShellProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

function FieldShell({ children, className, label }: FieldShellProps) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1.5",
        className,
      )}
    >
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

type SearchFilterProps = {
  className?: string;
  label?: string;
  name: string;
  placeholder?: string;
};

export function SearchFilter({
  className,
  label = "Buscar",
  name,
  placeholder,
}: SearchFilterProps) {
  const { setParam, values } = useFilterContext("SearchFilter");
  const initial = values[name] ?? "";
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input && input.value !== initial) {
      input.value = initial;
    }
  }, [initial]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <FieldShell className={className} label={label}>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-muted-foreground">
          <Search aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <input
          className="input pl-9"
          defaultValue={initial}
          onChange={(event) => {
            const nextValue = event.target.value;

            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
              setParam(name, nextValue.trim() || undefined);
            }, 300);
          }}
          placeholder={placeholder}
          ref={inputRef}
          type="search"
        />
      </span>
    </FieldShell>
  );
}

type SelectOption = {
  label: string;
  value: string;
};

type SelectFilterProps = {
  allLabel?: string;
  className?: string;
  label: string;
  name: string;
  options: SelectOption[];
};

export function SelectFilter({
  allLabel = "Todos",
  className,
  label,
  name,
  options,
}: SelectFilterProps) {
  const { setParam, values } = useFilterContext("SelectFilter");
  const value = values[name] ?? "";

  return (
    <FieldShell className={className} label={label}>
      <Select
        onValueChange={(next) => setParam(name, next || undefined)}
        value={value}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FieldShell>
  );
}

type DateRangeFilterProps = {
  allowClear?: boolean;
  className?: string;
  fallbackFromValue?: string;
  fallbackToValue?: string;
  fromName?: string;
  label?: string;
  placeholder?: string;
  toName?: string;
};

export function DateRangeFilter({
  allowClear = true,
  className,
  fallbackFromValue,
  fallbackToValue,
  fromName = "from",
  label = "Periodo",
  placeholder,
  toName = "to",
}: DateRangeFilterProps) {
  const { setMany, values } = useFilterContext("DateRangeFilter");
  const fromValue = values[fromName] ?? fallbackFromValue ?? "";
  const toValue = values[toName] ?? fallbackToValue ?? "";

  return (
    <FieldShell className={className} label={label}>
      <DateRangePicker
        allowClear={allowClear}
        fromValue={fromValue}
        onChange={({ from, to }) =>
          setMany({ [fromName]: from || undefined, [toName]: to || undefined })
        }
        placeholder={placeholder}
        toValue={toValue}
      />
    </FieldShell>
  );
}
