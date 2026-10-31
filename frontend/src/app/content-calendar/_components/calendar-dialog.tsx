'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorText, Field, FieldRow, Input, Select } from '@/components/ui/field';
import { MONTHS, latestFor, nextMonthOf, sameClient } from '@/lib/content-calendar/logic';
import type { CcCalendar } from '@/lib/content-calendar/types';
import { Chip, Modal } from './modal';

export interface CalendarValues {
  client: string;
  month: number;
  year: number;
}

/** Add a client-month, or change the client/month of an existing one. */
export function CalendarDialog({
  mode,
  cal,
  preClient,
  calendars,
  onSubmit,
  onClose,
}: {
  mode: 'new' | 'edit';
  cal: CcCalendar | null;
  /** Set when "+" next to a client was pressed: the month after their latest one is suggested. */
  preClient?: string;
  calendars: CcCalendar[];
  onSubmit: (values: CalendarValues) => Promise<void>;
  onClose: () => void;
}) {
  const editing = mode === 'edit' && cal;
  const init = useMemo<CalendarValues>(() => {
    if (editing) return { client: cal.client, month: cal.month, year: cal.year };
    const now = new Date();
    let next = nextMonthOf({ month: now.getMonth(), year: now.getFullYear() });
    if (preClient) {
      const latest = latestFor(calendars, preClient);
      if (latest) next = nextMonthOf(latest);
    }
    return { client: preClient ?? '', ...next };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [client, setClient] = useState(init.client);
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const clients = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of calendars) {
      const k = c.client.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c.client);
      }
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [calendars]);

  const nowYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = Math.min(nowYear - 1, year); y <= Math.max(nowYear + 3, year); y++) years.push(y);

  function pickClient(name: string) {
    setClient(name);
    const latest = latestFor(calendars, name);
    if (latest) {
      const next = nextMonthOf(latest);
      setMonth(next.month);
      setYear(next.year);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = client.trim();
    if (!name) return setErr('Enter the client name.');
    const dup = calendars.find((c) => (!editing || c.id !== cal.id) && sameClient(c.client, name) && c.month === month && c.year === year);
    if (dup) return setErr(`${dup.client} already has a ${MONTHS[month]} ${year} calendar.`);
    setBusy(true);
    setErr('');
    try {
      await onSubmit({ client: name, month, year });
      onClose();
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} eyebrow="Content calendar" title={editing ? 'Edit calendar' : 'Add calendar'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Client name" htmlFor="cc-client">
          <Input id="cc-client" autoFocus={!client} value={client} maxLength={100} autoComplete="off" placeholder="e.g. Arena Bangalore" onChange={(e) => setClient(e.target.value)} />
        </Field>
        {!editing && clients.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Existing clients">
            {clients.map((c) => (
              <Chip key={c} onClick={() => pickClient(c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
        <FieldRow>
          <Field label="Month" htmlFor="cc-month">
            <Select id="cc-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Year" htmlFor="cc-year">
            <Select id="cc-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>
        {err && <ErrorText>{err}</ErrorText>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            {editing ? 'Save changes' : 'Create calendar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
