'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/app/projects/_components/dialogs';
import { cc } from '@/lib/content-calendar/client';
import { MONTHS, countPosts, groupByClient, isEmptyDay, pickInitial } from '@/lib/content-calendar/logic';
import type { CcCalendar, CcDay, CcMe } from '@/lib/content-calendar/types';
import { AccessDialog } from './access-dialog';
import { CalendarDialog, type CalendarValues } from './calendar-dialog';
import { DayDialog } from './day-dialog';
import { MonthBoard } from './month-board';

type Modal = { type: 'cal'; mode: 'new' | 'edit'; client?: string } | { type: 'day'; day: number } | { type: 'delete' } | { type: 'access' } | null;

export function ContentCalendarView({ initialCalendars, me }: { initialCalendars: CcCalendar[]; me: CcMe }) {
  const [calendars, setCalendars] = useState(initialCalendars);
  const [activeId, setActiveId] = useState<string | null>(() => pickInitial(initialCalendars));
  const [modal, setModal] = useState<Modal>(null);
  const groups = useMemo(() => groupByClient(calendars), [calendars]);
  const active = calendars.find((c) => c.id === activeId) ?? null;

  // Other people edit too: pick up their changes whenever this tab comes back into view.
  useEffect(() => {
    async function refresh() {
      if (document.hidden) return;
      try {
        setCalendars(await cc<CcCalendar[]>('/calendars'));
      } catch {
        /* keep what is on screen; the next action reports any real problem */
      }
    }
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  async function createCalendar(v: CalendarValues) {
    const created = await cc<CcCalendar>('/calendars', { method: 'POST', body: v });
    setCalendars((list) => [...list, created]);
    setActiveId(created.id);
  }

  async function updateCalendar(id: string, v: CalendarValues) {
    const updated = await cc<CcCalendar>(`/calendars/${id}`, { method: 'PATCH', body: v });
    setCalendars((list) => list.map((c) => (c.id === id ? updated : c)));
  }

  async function deleteCalendar(id: string) {
    await cc(`/calendars/${id}`, { method: 'DELETE' });
    const rest = calendars.filter((c) => c.id !== id);
    setCalendars(rest);
    setActiveId(pickInitial(rest));
  }

  async function saveDay(calId: string, day: number, next: CcDay) {
    await cc(`/calendars/${calId}/days/${day}`, { method: 'PUT', body: next });
    setCalendars((list) =>
      list.map((c) => {
        if (c.id !== calId) return c;
        const days = { ...c.days };
        if (isEmptyDay(next)) delete days[String(day)];
        else days[String(day)] = next;
        return { ...c, days };
      }),
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4">
          <div className="flex flex-wrap gap-2">
            {me.canEdit && (
              <Button size="sm" onClick={() => setModal({ type: 'cal', mode: 'new' })}>
                <Plus size={14} /> Add calendar
              </Button>
            )}
            {me.canManage && (
              <Button variant="secondary" size="sm" onClick={() => setModal({ type: 'access' })}>
                <ShieldCheck size={14} /> Who can edit
              </Button>
            )}
          </div>

          <nav aria-label="Client calendars" className="flex flex-col gap-5">
            {groups.map((g) => (
              <div key={g.name.toLowerCase()} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="break-words text-sm font-semibold text-text">{g.name}</span>
                  {me.canEdit && (
                    <button
                      type="button"
                      aria-label={`Add a month for ${g.name}`}
                      title="Add another month"
                      onClick={() => setModal({ type: 'cal', mode: 'new', client: g.name })}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-text"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((c) => {
                    const selected = c.id === activeId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => setActiveId(c.id)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                          selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-text hover:border-primary',
                        )}
                      >
                        {MONTHS[c.month].slice(0, 3)} {c.year}
                        <span className={cn('tabular-nums', selected ? 'opacity-60' : 'text-muted')}>{countPosts(c)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {active ? (
            <MonthBoard
              cal={active}
              canEdit={me.canEdit}
              onOpenDay={(day) => setModal({ type: 'day', day })}
              onEdit={() => setModal({ type: 'cal', mode: 'edit' })}
              onDelete={() => setModal({ type: 'delete' })}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <h2 className="text-[32px] leading-tight text-text" style={{ fontWeight: 330 }}>
                No calendars yet
              </h2>
              <p className="max-w-sm text-sm text-muted">
                {me.canEdit ? 'Add a calendar with a client name and a month, then click any day to plan a post.' : 'Nothing has been planned yet. Anyone with edit access can add the first calendar.'}
              </p>
              {me.canEdit && (
                <Button size="sm" onClick={() => setModal({ type: 'cal', mode: 'new' })}>
                  <Plus size={14} /> Add calendar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {modal?.type === 'cal' && (
        <CalendarDialog
          mode={modal.mode}
          cal={active}
          preClient={modal.client}
          calendars={calendars}
          onSubmit={(v) => (modal.mode === 'edit' && active ? updateCalendar(active.id, v) : createCalendar(v))}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'day' && active && <DayDialog cal={active} day={modal.day} canEdit={me.canEdit} onSave={(day, next) => saveDay(active.id, day, next)} onClose={() => setModal(null)} />}
      {modal?.type === 'access' && <AccessDialog onClose={() => setModal(null)} />}
      {active && (
        <ConfirmDialog
          open={modal?.type === 'delete'}
          onOpenChange={(o) => !o && setModal(null)}
          title={`Delete ${active.client}, ${MONTHS[active.month]} ${active.year}?`}
          body={`This removes the calendar and its ${countPosts(active)} planned posts. It cannot be undone.`}
          confirmLabel="Delete calendar"
          danger
          onConfirm={() => deleteCalendar(active.id)}
        />
      )}
    </>
  );
}
