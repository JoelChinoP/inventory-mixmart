'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';

import { DateRangePopover } from './popover';
import { usePopoverPosition } from './use-popover-position';
import {
  type PresetKey,
  formatRangeLabel,
  normalizeRange,
  presetRange,
  rangeToValues,
  resolvePreset,
  startOfMonth,
} from './utils';

type DateRangePickerProps = {
  allowClear?: boolean;
  ariaLabel?: string;
  fromValue: string;
  toValue: string;
  onChange: (next: { from: string; to: string }) => void;
  fromLabel?: string;
  toLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
};

export function DateRangePicker({
  allowClear = true,
  ariaLabel,
  fromValue,
  toValue,
  onChange,
  placeholder = 'Seleccionar periodo',
  triggerClassName,
}: DateRangePickerProps) {
  const committedRange = useMemo(
    () => normalizeRange(fromValue, toValue),
    [fromValue, toValue],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    committedRange,
  );
  const [month, setMonth] = useState<Date>(
    () => committedRange?.from ?? startOfMonth(new Date()),
  );
  const timeZone = useMemo(
    () =>
      typeof window === 'undefined'
        ? undefined
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const close = useCallback(() => setOpen(false), []);
  const position = usePopoverPosition(
    open,
    triggerRef,
    containerRef,
    popoverRef,
    close,
  );

  const activeRange = open ? draftRange : committedRange;
  const hasValue = Boolean(fromValue || toValue);
  const activePreset = resolvePreset(activeRange);
  const triggerLabel = formatRangeLabel(committedRange, placeholder);
  const canApply = Boolean(draftRange?.from ?? draftRange?.to);

  const applySelection = () => {
    if (!canApply) return;

    const values = rangeToValues(draftRange);
    onChange(values);
    setOpen(false);
  };

  const applyPreset = (key: PresetKey) => {
    const next = presetRange(key);
    setDraftRange({ from: next.from, to: next.to });
    setMonth(startOfMonth(next.from));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-[8px] border border-input bg-surface-elevated px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-focus hover:border-primary-300',
          open ? 'border-primary-300 ring-4 ring-focus' : '',
          triggerClassName,
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
        <span className="flex min-w-0 items-center gap-2.5">
          <CalendarDays
            aria-hidden="true"
            className="size-4 shrink-0 text-primary"
          />
          <span
            className={cn(
              'min-w-0 truncate',
              !hasValue ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {triggerLabel}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1">
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 text-muted-foreground transition',
              open ? 'rotate-180' : '',
            )}
          />
        </span>
      </button>

      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <DateRangePopover
              activePreset={activePreset}
              activeRange={activeRange}
              allowClear={allowClear}
              canApply={canApply}
              draftRange={draftRange}
              month={month}
              onApply={applySelection}
              onApplyPreset={applyPreset}
              onClear={() => setDraftRange(undefined)}
              onClose={close}
              onMonthChange={setMonth}
              onSelectRange={setDraftRange}
              position={position}
              ref={popoverRef}
              timeZone={timeZone}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
