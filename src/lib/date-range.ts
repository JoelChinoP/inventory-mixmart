export type DateRangeKey = "today" | "week" | "month";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Ultimos 30 dias",
};

export const DATE_RANGE_KEYS: DateRangeKey[] = ["today", "week", "month"];

export function isValidRange(value: string | undefined): value is DateRangeKey {
  return value === "today" || value === "week" || value === "month";
}

export function resolveRange(value: string | undefined): DateRangeKey {
  return isValidRange(value) ? value : "week";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeekMonday(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export type ResolvedRange = {
  key: DateRangeKey;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
  detail: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
});

export function getRange(value: string | undefined): ResolvedRange {
  const key = resolveRange(value);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (key === "today") {
    const previousStart = new Date(todayStart);
    previousStart.setDate(previousStart.getDate() - 1);
    const previousEnd = new Date(todayEnd);
    previousEnd.setDate(previousEnd.getDate() - 1);
    return {
      key,
      start: todayStart,
      end: todayEnd,
      previousStart,
      previousEnd,
      label: DATE_RANGE_LABELS[key],
      detail: dateFormatter.format(todayStart),
    };
  }

  if (key === "week") {
    const start = startOfWeekMonday(now);
    const end = todayEnd;
    const previousEnd = new Date(start);
    previousEnd.setMilliseconds(-1);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);
    return {
      key,
      start,
      end,
      previousStart,
      previousEnd,
      label: DATE_RANGE_LABELS[key],
      detail: `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`,
    };
  }

  const start = new Date(todayStart);
  start.setDate(start.getDate() - 29);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 30);
  const previousEnd = new Date(start);
  previousEnd.setMilliseconds(-1);
  return {
    key,
    start,
    end: todayEnd,
    previousStart,
    previousEnd,
    label: DATE_RANGE_LABELS[key],
    detail: `${dateFormatter.format(start)} – ${dateFormatter.format(todayEnd)}`,
  };
}

export function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `Hace ${diffD} d`;
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}
