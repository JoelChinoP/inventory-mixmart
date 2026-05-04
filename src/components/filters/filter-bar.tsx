"use client";

import { RotateCcw, Search } from "lucide-react";
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
};

export function FilterBar({ children, className }: FilterBarProps) {
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
        aria-label="Filtros"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-control  px-2.5 pt-2 md:pt-4 shadow-soft",
          className,
        )}
      >
        {children}
        <div className="ml-auto flex items-center gap-2">
          {isPending ? (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
            />
          ) : null}
          {hasActiveFilters ? (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition hover:border-error/30 hover:bg-error-surface hover:text-error"
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
      </section>
    </FilterContext.Provider>
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
    <div
      className={cn(
        "relative min-w-0 flex-1 basis-full sm:basis-auto sm:w-60",
        className,
      )}
    >
      <span className="pointer-events-none absolute left-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-muted-foreground">
        <Search aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <input
        aria-label={label}
        className="h-9 w-full rounded-control border border-input bg-surface-elevated pl-8 pr-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-primary-300 focus:border-ring focus:outline-none focus:ring-4 focus:ring-focus"
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
        placeholder={placeholder ?? label}
        ref={inputRef}
        type="search"
      />
    </div>
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
    <div className={cn("min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:w-44", className)}>
      <Select
        aria-label={label}
        className="h-9 min-h-9 gap-2 px-2.5 py-1.5 text-sm font-normal"
        onValueChange={(next) => setParam(name, next || undefined)}
        placeholder={`${label}: ${allLabel}`}
        value={value}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
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
    <div className={cn("min-w-0 flex-1 basis-full sm:basis-auto sm:w-64", className)}>
      <DateRangePicker
        allowClear={allowClear}
        ariaLabel={label}
        fromValue={fromValue}
        onChange={({ from, to }) =>
          setMany({ [fromName]: from || undefined, [toName]: to || undefined })
        }
        placeholder={placeholder ?? label}
        toValue={toValue}
        triggerClassName="h-9 min-h-0 px-2.5 py-1.5 text-sm font-normal"
      />
    </div>
  );
}
