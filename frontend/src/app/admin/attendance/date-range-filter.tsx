'use client';

import { useState } from 'react';
import { Field, Select, Input } from '@/components/ui/field';

type Mode = 'this-month' | 'day' | 'month' | 'range';

function initialMode(filters: { date?: string; month?: string; from?: string; to?: string }): Mode {
  if (filters.date) return 'day';
  if (filters.month) return 'month';
  if (filters.from || filters.to) return 'range';
  return 'this-month';
}

/**
 * The backend only ever looks at one of date / month / (from & to) at a time (falling back to
 * the current calendar month when none are given) — so only one control needs to be visible at
 * once. Client-side so switching "Period" swaps the visible input without a page round-trip;
 * the inputs still submit natively as part of the surrounding filter <form>.
 */
export function DateRangeFilter({
  date,
  month,
  from,
  to,
}: {
  date?: string;
  month?: string;
  from?: string;
  to?: string;
}) {
  const [mode, setMode] = useState<Mode>(() => initialMode({ date, month, from, to }));

  return (
    <>
      <Field label="Period" htmlFor="period-mode">
        <Select id="period-mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="this-month">This month</option>
          <option value="day">Specific day</option>
          <option value="month">Specific month</option>
          <option value="range">Date range</option>
        </Select>
      </Field>

      {mode === 'day' && (
        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={date ?? ''} required />
        </Field>
      )}

      {mode === 'month' && (
        <Field label="Month" htmlFor="month">
          <Input id="month" name="month" type="month" defaultValue={month ?? ''} required />
        </Field>
      )}

      {mode === 'range' && (
        <>
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from ?? ''} required />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to ?? ''} required />
          </Field>
        </>
      )}
    </>
  );
}
