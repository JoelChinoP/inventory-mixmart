'use client';

import { es } from 'date-fns/locale';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import type { PopoverPosition } from './use-popover-position';
import { PRESETS, type PresetKey, formatRangeLabel } from './utils';

type DateRangePopoverProps = {
  position: PopoverPosition;
  activeRange: DateRange | undefined;
  draftRange: DateRange | undefined;
  activePreset: PresetKey | null;
  month: Date;
  timeZone: string | undefined;
  canApply: boolean;
  allowClear: boolean;
  onClose: () => void;
  onApplyPreset: (key: PresetKey) => void;
  onMonthChange: (date: Date) => void;
  onSelectRange: (range: DateRange | undefined) => void;
  onClear: () => void;
  onApply: () => void;
};

export const DateRangePopover = forwardRef<
  HTMLDivElement,
  DateRangePopoverProps
>(function DateRangePopover(
  {
    position,
    activeRange,
    draftRange,
    activePreset,
    month,
    timeZone,
    canApply,
    allowClear,
    onClose,
    onApplyPreset,
    onMonthChange,
    onSelectRange,
    onClear,
    onApply,
  },
  ref,
) {
  return (
    <div
      className="z-[90] max-h-[calc(100vh-1rem)] overflow-auto rounded-card border border-border bg-surface-elevated shadow-elevated"
      ref={ref}
      role="dialog"
      style={{
        left: position.left,
        position: 'fixed',
        top: position.top,
        transform:
          position.placement === 'top' ? 'translateY(-100%)' : undefined,
        width: position.width,
      }}
    >
      <div className="border-b border-border bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Periodo
            </p>
            {activeRange?.from ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatRangeLabel(activeRange, 'Elegir fechas')}
              </p>
            ) : null}
          </div>
          <Button
            aria-label="Cerrar calendario"
            onClick={onClose}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <Button
              className="rounded-full px-3"
              key={preset.key}
              onClick={() => onApplyPreset(preset.key)}
              size="xs"
              type="button"
              variant={activePreset === preset.key ? 'default' : 'outline'}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="rounded-control border border-border bg-surface p-2">
          <Calendar
            className="mx-auto w-fit bg-transparent p-0 [--cell-size:2rem]"
            classNames={{
              caption_label:
                'text-sm font-semibold capitalize text-foreground ',
              month: 'w-fit gap-2 ',
              month_caption:
                'flex h-8 w-full items-center justify-center px-8 ',
              months: 'flex flex-col ',
              nav: 'absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1 ',
              root: 'relative mx-auto w-fit',
              table: 'w-fit border-collapse',
              today:
                'rounded-md border border-primary-200 bg-primary-50 text-primary data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground ',
              weekday:
                'w-(--cell-size) rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mx-0.25',
              week: 'mt-1 flex w-full',
            }}
            hideNavigation={false}
            locale={es}
            mode="range"
            month={month}
            onMonthChange={onMonthChange}
            onSelect={onSelectRange}
            required
            selected={draftRange}
            showOutsideDays={false}
            timeZone={timeZone}
            weekStartsOn={1}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground"></p>
          <div className="flex shrink-0 items-center gap-2">
            {allowClear ? (
              <Button
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                Limpiar
              </Button>
            ) : null}
            <Button
              disabled={!canApply}
              onClick={onApply}
              size="sm"
              type="button"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
