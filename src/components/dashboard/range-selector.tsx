"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  DATE_RANGE_KEYS,
  DATE_RANGE_LABELS,
  type DateRangeKey,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

type RangeSelectorProps = {
  value: DateRangeKey;
};

export function RangeSelector({ value }: RangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: DateRangeKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "week") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-control border border-ink-foreground/15 bg-ink-foreground/10 px-3.5 py-1.5 text-sm font-medium text-ink-foreground transition hover:bg-ink-foreground/15"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {DATE_RANGE_LABELS[value]}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      {open ? (
        <ul
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-card border border-border bg-surface-elevated p-1 shadow-elevated"
          role="listbox"
        >
          {DATE_RANGE_KEYS.map((key) => {
            const active = key === value;
            return (
              <li key={key}>
                <button
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-primary-50 font-semibold text-primary"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                  onClick={() => choose(key)}
                  role="option"
                  type="button"
                >
                  {DATE_RANGE_LABELS[key]}
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
