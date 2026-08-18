'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { statusBadgeKey, statusLabel } from '@/lib/attendance-format';

export interface CalendarDay {
  date: string;
  status: string;
  holidayName?: string;
  holidayType?: string;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const LEGEND_STATUSES = [
  'present',
  'late',
  'early_checkout',
  'half_day',
  'absent',
  'on_leave',
  'weekend',
  'holiday',
  'holiday_worked',
  'week_off_worked',
];

/** Renders one month of attendance as a color-coded calendar grid, given a "YYYY-MM" month
 * and the day views for it (as returned by /attendance/me or /attendance/admin/employees/:id). */
export function AttendanceMonthCalendar({ month, history }: { month: string; history: CalendarDay[] }) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const byDate = useMemo(() => new Map(history.map((h) => [h.date, h])), [history]);

  const [year, mon] = month.split('-').map(Number);
  const m0 = mon - 1;
  const startWeekday = new Date(year, m0, 1).getDay();
  const total = new Date(year, m0 + 1, 0).getDate();

  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    cells.push({ day: d, date: `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {LEGEND_STATUSES.map((s) => (
          <Pill key={s} tone={statusBadgeKey(s)}>
            {statusLabel(s)}
          </Pill>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {WEEKDAY_LETTERS.map((d, i) => (
          <div key={i} className="py-1 text-center text-[11px] font-semibold uppercase text-muted">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="min-h-16" />;
          const day = byDate.get(cell.date);
          const hasHoliday = !!day?.holidayName;
          return (
            <div
              key={i}
              onClick={hasHoliday ? () => setSelected(day!) : undefined}
              role={hasHoliday ? 'button' : undefined}
              tabIndex={hasHoliday ? 0 : undefined}
              className={cn(
                'flex min-h-16 flex-col gap-1 rounded-md border border-border p-1.5',
                hasHoliday && 'cursor-pointer',
              )}
            >
              <span className="text-xs font-semibold text-text">{cell.day}</span>
              {day && (
                <Pill tone={statusBadgeKey(day.status)} className="max-w-full truncate text-[10px]">
                  {day.holidayName ?? statusLabel(day.status)}
                </Pill>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
          <div>
            <strong className="text-sm text-text">Holiday: {selected.holidayName}</strong>
            <p className="mt-1 text-sm text-muted">
              Date:{' '}
              {new Date(`${selected.date}T00:00:00`).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {selected.holidayType ? ` · Type: ${statusLabel(selected.holidayType)}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
