'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { DOWS, MONTHS, countPosts, daysIn } from '@/lib/content-calendar/logic';
import type { CcCalendar } from '@/lib/content-calendar/types';

const DISPLAY_FONT = '"NeueHaasGrotesk Display", "Inter Display", Helvetica, Arial, sans-serif';
const pad = (n: number) => String(n).padStart(2, '0');

/** One client's month. Same card, eyebrow and thin display title as the attendance calendar. */
export function MonthBoard({
  cal,
  canEdit,
  onOpenDay,
  onEdit,
  onDelete,
}: {
  cal: CcCalendar;
  canEdit: boolean;
  onOpenDay: (day: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Read on the client only, so server and browser agree on the first paint.
  const [today, setToday] = useState('');
  useEffect(() => {
    const n = new Date();
    setToday(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`);
  }, []);

  const total = daysIn(cal);
  const startWeekday = new Date(cal.year, cal.month, 1).getDay();
  const planned = countPosts(cal);
  const specials = Object.entries(cal.days)
    .filter(([, d]) => d.marker)
    .map(([day, d]) => ({ day: Number(day), label: d.marker!.label }))
    .sort((a, b) => a.day - b.day);

  const cells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-8"
      style={{
        fontFeatureSettings: '"ss03"',
        boxShadow: '0 8px 8px rgba(0,0,0,0.04), 0 4px 4px rgba(0,0,0,0.04), 0 2px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[12px] uppercase tracking-[0.72px] text-muted">
            {cal.client} &middot; {planned} {planned === 1 ? 'post' : 'posts'} planned
          </p>
          <h2 className="mt-1 text-[44px] leading-none text-text sm:text-[56px]" style={{ fontWeight: 330, fontFamily: DISPLAY_FONT }}>
            {MONTHS[cal.month]} <span className="text-muted">{cal.year}</span>
          </h2>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`${MONTHS[cal.month]} ${cal.year}`}>
        {DOWS.map((d, i) => (
          <div key={d} className={cn('pb-1 text-center text-[11px] font-medium uppercase tracking-[0.72px] text-muted', (i === 0 || i === 6) && 'opacity-70')}>
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const data = cal.days[String(day)];
          const posts = data?.posts ?? [];
          const marker = data?.marker ?? null;
          const isToday = today === `${cal.year}-${pad(cal.month + 1)}-${pad(day)}`;
          const label = `${day} ${MONTHS[cal.month]}, ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}${marker ? `, ${marker.label}` : ''}`;
          const filled = posts.length > 0 || marker;

          const inner = (
            <>
              <span className="flex items-start justify-between gap-1">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold tabular-nums sm:h-7 sm:min-w-7 sm:text-[13px]',
                    isToday ? 'bg-primary text-on-primary' : 'text-text',
                  )}
                >
                  {day}
                </span>
                {marker && (
                  <>
                    <span className="mt-1 h-2 w-2 rounded-full bg-danger sm:hidden" aria-hidden />
                    <span title={marker.label} className="hidden min-w-0 max-w-full truncate rounded-full bg-primary-tint px-2 py-0.5 text-[10.5px] font-medium text-text sm:inline-block">
                      {marker.label}
                    </span>
                  </>
                )}
              </span>

              {posts.length > 0 && (
                <>
                  <span className="text-[11px] font-semibold tabular-nums text-muted sm:hidden">{posts.length}</span>
                  <span className="hidden min-w-0 flex-col gap-1 sm:flex">
                    {posts.slice(0, 3).map((p) => (
                      <span key={p.id} title={p.note || undefined} className="truncate rounded-full bg-bg px-2 py-0.5 text-center text-[10.5px] font-medium uppercase tracking-[0.3px] text-text">
                        {p.type}
                      </span>
                    ))}
                    {posts.length > 3 && <span className="text-center text-[10.5px] font-medium text-muted">+{posts.length - 3} more</span>}
                  </span>
                </>
              )}
            </>
          );

          const base = cn(
            'flex aspect-square min-h-[52px] min-w-0 flex-col justify-between gap-1 rounded-lg border p-1.5 text-left transition-all duration-200 sm:aspect-auto sm:min-h-[104px] sm:p-2.5',
            filled ? 'border-border bg-surface' : 'border-dashed border-border bg-transparent',
          );

          // Read-only viewers can still open a day that has something on it.
          if (!canEdit && !filled) return <div key={day} className={base}>{inner}</div>;
          return (
            <button key={day} type="button" aria-label={label} onClick={() => onOpenDay(day)} className={cn(base, 'cursor-pointer hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]')}>
              {inner}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {specials.length > 0 ? (
          <>
            <p className="text-[12px] uppercase tracking-[0.72px] text-muted">Special days</p>
            <ul className="mt-2 flex flex-wrap gap-x-7 gap-y-2 text-sm text-text">
              {specials.map((s) => (
                <li key={s.day} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden />
                  <b className="tabular-nums">{s.day}</b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-[13px] text-muted">{canEdit ? 'Click a day to add posts or mark a special day' : 'Tap a day to see what is planned'}</p>
        )}
      </div>
    </div>
  );
}
