"use client";

import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  allowClear?: boolean;
  fromValue: string;
  toValue: string;
  onChange: (next: { from: string; to: string }) => void;
  fromLabel?: string;
  toLabel?: string;
  placeholder?: string;
};

type Position = {
  left: number;
  top: number;
  width: number;
  placement: "bottom" | "top";
};

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PRESETS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "30", label: "Ultimos 30 dias" },
  { key: "90", label: "Ultimos 90 dias" },
] as const;

const shortFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
});

const longFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parseISO(value: string) {
  if (!value || !ISO_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeRange(fromValue: string, toValue: string) {
  const fromDate = parseISO(fromValue);
  const toDate = parseISO(toValue);

  if (!fromDate && !toDate) return undefined;

  if (fromDate && toDate) {
    return fromDate <= toDate
      ? { from: fromDate, to: toDate }
      : { from: toDate, to: fromDate };
  }

  const singleDay = fromDate ?? toDate;
  return singleDay ? { from: singleDay, to: singleDay } : undefined;
}

function rangeToValues(range: DateRange | undefined) {
  if (!range?.from && !range?.to) {
    return { from: "", to: "" };
  }

  const from = range?.from ?? range?.to;
  const to = range?.to ?? range?.from;

  if (!from || !to) {
    return { from: "", to: "" };
  }

  return { from: toISO(from), to: toISO(to) };
}

function formatRangeLabel(range: DateRange | undefined, fallback: string) {
  if (!range?.from && !range?.to) return fallback;

  const from = range?.from ?? range?.to;
  const to = range?.to ?? range?.from;

  if (!from || !to) return fallback;
  if (toISO(from) === toISO(to)) return longFormatter.format(from);

  return `${shortFormatter.format(from)} - ${longFormatter.format(to)}`;
}

function presetRange(key: (typeof PRESETS)[number]["key"]) {
  const today = startOfDay(new Date());

  if (key === "today") {
    return { from: today, to: today };
  }

  if (key === "week") {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const from = new Date(today);
    from.setDate(today.getDate() + diff);
    return { from, to: today };
  }

  if (key === "month") {
    return { from: startOfMonth(today), to: today };
  }

  const days = Number(key);
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));
  return { from, to: today };
}

function resolvePreset(range: DateRange | undefined) {
  const values = rangeToValues(range);

  return (
    PRESETS.find((preset) => {
      const current = presetRange(preset.key);
      return values.from === toISO(current.from) && values.to === toISO(current.to);
    })?.key ?? null
  );
}

export function DateRangePicker({
  allowClear = true,
  fromValue,
  toValue,
  onChange,
  fromLabel = "Desde",
  toLabel = "Hasta",
  placeholder = "Seleccionar periodo",
}: DateRangePickerProps) {
  const committedRange = useMemo(
    () => normalizeRange(fromValue, toValue),
    [fromValue, toValue],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(committedRange);
  const [month, setMonth] = useState<Date>(
    () => committedRange?.from ?? startOfMonth(new Date()),
  );
  const [monthsToShow, setMonthsToShow] = useState(1);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const wide = window.innerWidth >= 920;
      const width = wide
        ? Math.min(640, window.innerWidth - 32)
        : Math.min(Math.max(rect.width, 312), window.innerWidth - 16);
      const height = wide ? 470 : 560;
      const bottomSpace = window.innerHeight - rect.bottom;
      const placement =
        bottomSpace < height && rect.top > height ? "top" : "bottom";

      setMonthsToShow(wide ? 2 : 1);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: placement === "bottom" ? rect.bottom + 8 : rect.top - 8,
        width,
        placement,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const activeRange = open ? draftRange : committedRange;
  const hasValue = Boolean(fromValue || toValue);
  const activePreset = resolvePreset(activeRange);
  const triggerLabel = formatRangeLabel(committedRange, placeholder);

  const applySelection = () => {
    const values = rangeToValues(draftRange);
    onChange(values);
    setOpen(false);
  };

  const clearSelection = () => {
    setDraftRange(undefined);
    onChange({ from: "", to: "" });
    setMonth(startOfMonth(new Date()));
    setOpen(false);
  };

  const applyPreset = (key: (typeof PRESETS)[number]["key"]) => {
    const next = presetRange(key);
    const nextRange = { from: next.from, to: next.to };
    setDraftRange(nextRange);
    setMonth(startOfMonth(next.from));
    onChange({ from: toISO(next.from), to: toISO(next.to) });
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-input bg-surface-elevated px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-focus hover:border-primary-300",
          open ? "border-primary-300 ring-4 ring-focus" : "",
        )}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          setDraftRange(committedRange);
          setMonth(committedRange?.from ?? startOfMonth(new Date()));
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <span
            className={cn(
              "min-w-0 truncate font-medium",
              !hasValue ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {triggerLabel}
          </span>
        </span>

        {hasValue && allowClear ? (
          <span
            aria-label="Limpiar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-error-surface hover:text-error"
            onClick={(event) => {
              event.stopPropagation();
              clearSelection();
            }}
            role="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        ) : (
          <CalendarDays
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          />
        )}
      </button>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-[90] max-h-[calc(100vh-1rem)] overflow-auto rounded-card border border-border bg-surface-elevated shadow-elevated"
              ref={popoverRef}
              role="dialog"
              style={{
                left: position.left,
                position: "fixed",
                top: position.top,
                transform:
                  position.placement === "top" ? "translateY(-100%)" : undefined,
                width: position.width,
              }}
            >
              <div className="border-b border-border bg-surface px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Periodo
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">
                      {formatRangeLabel(activeRange, "Elegir fechas")}
                    </p>
                  </div>
                  <Button
                    aria-label="Cerrar calendario"
                    onClick={() => setOpen(false)}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <Button
                      className="rounded-full"
                      key={preset.key}
                      onClick={() => applyPreset(preset.key)}
                      size="xs"
                      type="button"
                      variant={activePreset === preset.key ? "default" : "outline"}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-3">
                <div className="overflow-hidden rounded-control border border-border bg-surface">
                  <Calendar
                    animate
                    className="w-full bg-transparent p-0 [--cell-size:2.2rem] sm:[--cell-size:2.45rem]"
                    classNames={{
                      caption_label:
                        "text-sm font-semibold capitalize text-foreground",
                      month: "w-full gap-3",
                      month_caption: "flex h-9 w-full items-center justify-center px-9",
                      months: cn(
                        "flex flex-col gap-3",
                        monthsToShow === 2 ? "md:flex-row" : "md:flex-col",
                      ),
                      nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 px-1",
                      root: "w-full",
                      table: "w-full border-collapse",
                      today:
                        "rounded-md border border-primary-200 bg-primary-50 text-primary data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
                      weekday:
                        "flex-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                    }}
                    fixedWeeks
                    locale={es}
                    mode="range"
                    month={month}
                    numberOfMonths={monthsToShow}
                    onMonthChange={setMonth}
                    onSelect={setDraftRange}
                    pagedNavigation={monthsToShow === 2}
                    selected={draftRange}
                    showOutsideDays
                    weekStartsOn={1}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface px-3 py-2">
                  <SelectionRow
                    label={fromLabel}
                    value={
                      activeRange?.from ? longFormatter.format(activeRange.from) : "-"
                    }
                  />
                  <SelectionRow
                    label={toLabel}
                    value={activeRange?.to ? longFormatter.format(activeRange.to) : "-"}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-1">
                  {allowClear ? (
                    <Button
                      onClick={clearSelection}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Limpiar
                    </Button>
                  ) : null}
                  <Button
                    disabled={!activeRange?.from}
                    onClick={applySelection}
                    size="sm"
                    type="button"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function SelectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
