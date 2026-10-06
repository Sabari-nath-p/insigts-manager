export const DAY_MS = 86_400_000;

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return isoDate(new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS));
}

export function todayUtc(): string {
  return isoDate(new Date());
}

export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = '7d' | '30d' | 'this-month' | 'last-month';

/** Resolves a preset (or explicit from/to) into an inclusive UTC date range. Defaults to the last 30 days. */
export function resolveRange(preset: string | undefined, from?: string, to?: string, today = todayUtc()): DateRange {
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (valid(from) && valid(to) && (from as string) <= (to as string)) return { from: from as string, to: to as string };
  switch (preset) {
    case '7d':
      return { from: addDays(today, -6), to: today };
    case 'this-month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'last-month': {
      const first = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
      const lastPrev = new Date(first.getTime() - DAY_MS);
      return { from: `${isoDate(lastPrev).slice(0, 7)}-01`, to: isoDate(lastPrev) };
    }
    default:
      return { from: addDays(today, -29), to: today };
  }
}

/** The equal-length range immediately before `range`, for "vs previous period" comparisons. */
export function previousRange(range: DateRange): DateRange {
  const days = Math.round((new Date(`${range.to}T00:00:00Z`).getTime() - new Date(`${range.from}T00:00:00Z`).getTime()) / DAY_MS) + 1;
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}
