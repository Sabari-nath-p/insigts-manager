'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { statusLabel } from '@/lib/attendance-format';

export interface CalendarDay {
  date: string;
  status: string;
  holidayName?: string;
  holidayType?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Status -> visual treatment, for both themes.
 * Light: soft pastel tints (aloe / pistachio for presence and holidays) so a month scans at a glance.
 * Dark: the same hues as translucent fills on the dark surface, with light text.
 * The two "worked on a day off" statuses invert: dark cell in light mode, light cell in dark mode.
 */
const STATUS_STYLE: Record<string, { cell: string; dot: string; chip: string }> = {
  present: {
    cell: 'bg-[#d4f9e0] border-[#bdeccb] dark:bg-emerald-400/15 dark:border-emerald-400/30',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  late: {
    cell: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    dot: 'bg-amber-500',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  early_checkout: {
    cell: 'bg-orange-50 border-orange-200 dark:bg-orange-400/15 dark:border-orange-400/30',
    dot: 'bg-orange-500',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  half_day: {
    cell: 'bg-sky-50 border-sky-200 dark:bg-sky-400/15 dark:border-sky-400/30',
    dot: 'bg-sky-500',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  absent: {
    cell: 'bg-rose-50 border-rose-200 dark:bg-rose-400/15 dark:border-rose-400/30',
    dot: 'bg-rose-500',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  on_leave: {
    cell: 'bg-violet-50 border-violet-200 dark:bg-violet-400/15 dark:border-violet-400/30',
    dot: 'bg-violet-500',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  weekend: {
    cell: 'bg-bg border-border',
    dot: 'bg-zinc-400',
    chip: 'bg-zinc-200/70 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
  },
  holiday: {
    cell: 'bg-[#c1fbd4] border-[#a6efbf] dark:bg-[#c1fbd4]/20 dark:border-[#c1fbd4]/40',
    dot: 'bg-emerald-700 dark:bg-[#c1fbd4]',
    chip: 'bg-white/70 text-black dark:bg-white/10 dark:text-white',
  },
  holiday_worked: {
    cell: 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black',
    dot: 'bg-[#c1fbd4] dark:bg-emerald-600',
    chip: 'bg-white/15 text-white dark:bg-black/10 dark:text-black',
  },
  week_off_worked: {
    cell: 'bg-zinc-800 border-zinc-800 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-black',
    dot: 'bg-[#d4f9e0] dark:bg-emerald-600',
    chip: 'bg-white/15 text-white dark:bg-black/10 dark:text-black',
  },
};

const FALLBACK_STYLE = { cell: 'bg-surface border-border', dot: 'bg-zinc-400', chip: 'bg-zinc-100 text-black dark:bg-white/10 dark:text-white' };
const styleFor = (s: string) => STATUS_STYLE[s] ?? FALLBACK_STYLE;
const isInvertedCell = (s: string) => s === 'holiday_worked' || s === 'week_off_worked';

const LEGEND_ORDER = [
  'present', 'late', 'early_checkout', 'half_day', 'absent',
  'on_leave', 'weekend', 'holiday', 'holiday_worked', 'week_off_worked',
];

const DISPLAY_FONT = '"NeueHaasGrotesk Display", "Inter Display", Helvetica, Arial, sans-serif';

const pad = (n: number) => String(n).padStart(2, '0');

/** Renders one month of attendance as an interactive calendar, given a "YYYY-MM" month
 * and the day views for it (as returned by /attendance/me or /attendance/admin/employees/:id). */
export function AttendanceMonthCalendar({ month, history }: { month: string; history: CalendarDay[] }) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(history.map((h) => [h.date, h])), [history]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const h of history) c[h.status] = (c[h.status] ?? 0) + 1;
    return c;
  }, [history]);

  const [year, mon] = month.split('-').map(Number);
  const m0 = mon - 1;
  const startWeekday = new Date(year, m0, 1).getDay();
  const total = new Date(year, m0 + 1, 0).getDate();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const monthTitle = new Date(year, m0, 1).toLocaleDateString(undefined, { month: 'long' });

  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push({ day: d, date: `${year}-${pad(mon)}-${pad(d)}` });

  const legend = LEGEND_ORDER.filter((s) => counts[s]);
  const extraStatuses = Object.keys(counts).filter((s) => !LEGEND_ORDER.includes(s));
  const legendAll = [...legend, ...extraStatuses];

  const summary = [
    { key: 'present', label: 'Present' },
    { key: 'late', label: 'Late' },
    { key: 'absent', label: 'Absent' },
    { key: 'on_leave', label: 'On leave' },
  ];

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-8"
      style={{
        fontFeatureSettings: '"ss03"',
        boxShadow:
          '0 8px 8px rgba(0,0,0,0.04), 0 4px 4px rgba(0,0,0,0.04), 0 2px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header: thin display month + summary tiles */}
      <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.72px] text-muted">Attendance</p>
          <h2 className="mt-1 text-[44px] leading-none text-text sm:text-[56px]" style={{ fontWeight: 330, fontFamily: DISPLAY_FONT }}>
            {monthTitle} <span className="text-muted">{year}</span>
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {summary.map((s) => (
            <div key={s.key} className="rounded-lg bg-bg px-3 py-2 text-center sm:px-4">
              <div className="text-2xl leading-none text-text sm:text-3xl" style={{ fontWeight: 330, fontFamily: DISPLAY_FONT }}>
                {counts[s.key] ?? 0}
              </div>
              <div className="mt-1 text-[11px] font-medium text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend doubles as a filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {legendAll.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : s)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-text hover:border-primary',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', styleFor(s).dot)} />
              {statusLabel(s)}
              <span className={cn('tabular-nums', active ? 'opacity-60' : 'text-muted')}>{counts[s]}</span>
            </button>
          );
        })}
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted underline underline-offset-2 hover:text-text"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'pb-1 text-center text-[11px] font-medium uppercase tracking-[0.72px] text-muted',
              (i === 0 || i === 6) && 'opacity-70',
            )}
          >
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const day = byDate.get(cell.date);
          const isToday = cell.date === todayStr;
          const isSelected = selected?.date === cell.date;
          const st = day ? styleFor(day.status) : FALLBACK_STYLE;
          const inverted = day ? isInvertedCell(day.status) : false;
          const dimmed = filter !== null && day?.status !== filter;
          const label = day ? day.holidayName ?? statusLabel(day.status) : '';

          const base = cn(
            'group relative flex aspect-square min-h-[52px] flex-col justify-between rounded-lg border p-1.5 text-left transition-all duration-200 sm:aspect-auto sm:min-h-[84px] sm:p-2.5',
            st.cell,
            dimmed && 'opacity-25',
            isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
          );

          const inner = (
            <>
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold tabular-nums sm:h-7 sm:min-w-7 sm:text-[13px]',
                  // One text colour per case, so two colour classes never compete for the same element.
                  isToday
                    ? inverted
                      ? 'bg-white text-black dark:bg-black dark:text-white'
                      : 'bg-primary text-on-primary'
                    : inverted
                      ? 'text-white dark:text-black'
                      : 'text-text',
                )}
              >
                {cell.day}
              </span>

              {day && (
                <>
                  <span className={cn('h-1.5 w-1.5 rounded-full sm:hidden', st.dot)} />
                  <span
                    className={cn(
                      'hidden max-w-full truncate rounded-full px-2 py-0.5 text-[10.5px] font-medium sm:inline-block',
                      st.chip,
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </>
          );

          if (!day) {
            return (
              <div key={i} className={cn(base, 'border-dashed bg-transparent', dimmed && 'opacity-25')}>
                {inner}
              </div>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(isSelected ? null : day)}
              aria-pressed={isSelected}
              aria-label={`${cell.date}: ${label}`}
              className={cn(base, 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]')}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <div aria-live="polite" className="mt-6">
        {selected ? (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg px-5 py-4">
            <div className="flex items-center gap-4">
              <span className={cn('h-10 w-1.5 rounded-full', styleFor(selected.status).dot)} />
              <div>
                <p className="text-[12px] uppercase tracking-[0.72px] text-muted">
                  {new Date(`${selected.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-0.5 text-[22px] leading-tight text-text" style={{ fontWeight: 400, fontFamily: DISPLAY_FONT }}>
                  {selected.holidayName ?? statusLabel(selected.status)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {statusLabel(selected.status)}
                  {selected.holidayType ? ` · ${statusLabel(selected.holidayType)}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded-full border border-primary bg-surface px-5 py-2 text-sm font-medium text-text transition-colors hover:bg-primary hover:text-on-primary"
            >
              Close
            </button>
          </div>
        ) : (
          <p className="text-center text-[13px] text-muted">Tap any day for details</p>
        )}
      </div>
    </div>
  );
}
