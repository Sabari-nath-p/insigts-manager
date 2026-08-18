'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import calStyles from './holiday-calendar.module.css';
import { Holiday, holidayTypeBadgeKey, holidayTypeLabel } from './holiday-types';
import { HolidayList } from './holiday-list';

type View = 'month' | 'year' | 'list';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatFullDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function HolidayCalendar({
  holidays,
  departments,
  initialYear,
  initialMonth,
}: {
  holidays: Holiday[];
  departments: string[];
  initialYear: number;
  initialMonth: number; // 0-indexed
}) {
  const [view, setView] = useState<View>('month');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<Holiday | null>(null);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays) {
      if (!map.has(h.date)) map.set(h.date, h);
    }
    return map;
  }, [holidays]);

  function goToMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  function renderMonthCells(y: number, m: number) {
    const startWeekday = new Date(y, m, 1).getDay();
    const total = daysInMonth(y, m);
    const cells: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      cells.push({ day: d, date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    return cells;
  }

  function renderMonthGrid(y: number, m: number) {
    const cells = renderMonthCells(y, m);
    return (
      <div className={calStyles.monthGrid}>
        {WEEKDAY_LETTERS.map((d, i) => (
          <div key={i} className={calStyles.weekdayHeader}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className={calStyles.emptyCell} />;
          const holiday = holidayByDate.get(cell.date);
          const isSunday = new Date(`${cell.date}T00:00:00`).getDay() === 0;
          return (
            <div
              key={i}
              className={`${calStyles.dayCell} ${holiday ? calStyles.holidayCell : ''} ${!holiday && isSunday ? calStyles.weekendCell : ''}`}
              onClick={holiday ? () => setSelected(holiday) : undefined}
              role={holiday ? 'button' : undefined}
              tabIndex={holiday ? 0 : undefined}
            >
              <span className={calStyles.dayNumber}>{cell.day}</span>
              {holiday && (
                <Pill tone={holidayTypeBadgeKey(holiday.type)} className="max-w-full truncate text-[10px]">
                  {holiday.name}
                </Pill>
              )}
              {!holiday && isSunday && <span className={calStyles.dayBadge}>Week off</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMiniMonth(y: number, m: number) {
    const cells = renderMonthCells(y, m);
    return (
      <div key={m} className={calStyles.miniMonth}>
        <div className={calStyles.miniMonthTitle}>{MONTH_NAMES[m]}</div>
        <div className={calStyles.miniGrid}>
          {WEEKDAY_LETTERS.map((d, i) => (
            <div key={i} className={calStyles.miniWeekdayHeader}>
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className={calStyles.miniCell} />;
            const holiday = holidayByDate.get(cell.date);
            return (
              <div
                key={i}
                className={`${calStyles.miniCell} ${holiday ? calStyles.miniCellHoliday : ''}`}
                style={holiday ? { background: 'var(--color-primary)' } : undefined}
                onClick={holiday ? () => setSelected(holiday) : undefined}
                title={holiday?.name}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['month', 'year', 'list'] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              view === v ? 'border-primary bg-primary text-white' : 'border-border text-text hover:bg-black/[0.03] dark:hover:bg-white/[0.06]',
            )}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)} view
          </button>
        ))}
      </div>

      {view === 'month' && (
        <>
          <div className={calStyles.monthNav}>
            <Button variant="secondary" size="sm" onClick={() => goToMonth(-1)}>
              ← Prev
            </Button>
            <span className={calStyles.monthTitle}>
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="secondary" size="sm" onClick={() => goToMonth(1)}>
              Next →
            </Button>
          </div>
          {renderMonthGrid(year, month)}
        </>
      )}

      {view === 'year' && (
        <>
          <div className={calStyles.monthNav}>
            <Button variant="secondary" size="sm" onClick={() => setYear(year - 1)}>
              ← {year - 1}
            </Button>
            <span className={calStyles.monthTitle}>{year}</span>
            <Button variant="secondary" size="sm" onClick={() => setYear(year + 1)}>
              {year + 1} →
            </Button>
          </div>
          <div className={calStyles.yearGrid}>
            {Array.from({ length: 12 }, (_, m) => renderMiniMonth(year, m))}
          </div>
        </>
      )}

      {view === 'list' && <HolidayList holidays={holidays} departments={departments} />}

      {selected && (
        <div className="mt-4 rounded-md border border-border p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text">{selected.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {formatFullDate(selected.date)} · {holidayTypeLabel(selected.type)}
                {selected.isTentative ? ' · Tentative' : ''}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          {selected.description && <p className="text-sm text-text">{selected.description}</p>}
          <p className="mt-1 text-sm text-muted">
            {selected.isPaid ? 'Paid' : 'Unpaid'} · {selected.isOptional ? 'Optional' : 'Compulsory'} · Applies to{' '}
            {selected.applicableDepartments?.length ? selected.applicableDepartments.join(', ') : 'all employees'}
          </p>
        </div>
      )}
    </div>
  );
}
