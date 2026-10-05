import { DateRange, addDays } from './pm-dates';

export const STUCK_DAYS = 5;
export const HIGH_LOAD_FACTOR = 1.5;

export type HealthStatus = 'On track' | 'At risk' | 'Behind';

/**
 * Fixed, documented rules (also shown to users in the "How this is calculated" popover):
 *  - Behind:  more than 25% of open tasks are overdue
 *  - At risk: more than 10% of open tasks are overdue, or more than 3 tasks are stuck
 *  - On track: everything else (including a project with no open tasks)
 */
export function healthStatus(open: number, overdue: number, stuck: number): HealthStatus {
  if (open > 0 && overdue / open > 0.25) return 'Behind';
  if ((open > 0 && overdue / open > 0.1) || stuck > 3) return 'At risk';
  return 'On track';
}

/** Members whose open count is more than 1.5x the average of members who have open work. */
export function flagHighLoad(opens: Array<{ id: string; open: number }>): Set<string> {
  const active = opens.filter((o) => o.open > 0);
  if (active.length < 2) return new Set();
  const avg = active.reduce((s, o) => s + o.open, 0) / active.length;
  return new Set(active.filter((o) => o.open > avg * HIGH_LOAD_FACTOR).map((o) => o.id));
}

/** Every date in the inclusive range, zero-filled from a sparse day->count map. */
export function fillDays(range: DateRange, counts: Map<string, number>): Array<{ date: string; count: number }> {
  const out: Array<{ date: string; count: number }> = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push({ date: d, count: counts.get(d) ?? 0 });
  return out;
}

/** Monday of the ISO week containing the date. */
export function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function toWeekly(days: Array<{ date: string; count: number }>): Array<{ date: string; count: number }> {
  const weeks = new Map<string, number>();
  for (const d of days) weeks.set(weekStart(d.date), (weeks.get(weekStart(d.date)) ?? 0) + d.count);
  return [...weeks.entries()].map(([date, count]) => ({ date, count }));
}

export function cumulative(days: Array<{ date: string; count: number }>): number[] {
  let run = 0;
  return days.map((d) => (run += d.count));
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 CSV with a BOM so spreadsheet apps detect the encoding. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
