'use client';

import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { ErrorText, Field, Input, Textarea } from '@/components/ui/field';
import { DOW_LONG, EMPTY_DAY, MONTHS, QUICK_TYPES, newId } from '@/lib/content-calendar/logic';
import type { CcCalendar, CcDay } from '@/lib/content-calendar/types';
import { Chip, Modal } from './modal';
import { TypeDot } from './type-dot';

/**
 * One day of a calendar. Every change saves the whole day straight away (PUT), so a person editing
 * Tuesday never overwrites someone else's changes to Wednesday.
 */
export function DayDialog({
  cal,
  day,
  canEdit,
  onSave,
  onClose,
}: {
  cal: CcCalendar;
  day: number;
  canEdit: boolean;
  onSave: (day: number, next: CcDay) => Promise<void>;
  onClose: () => void;
}) {
  const data = cal.days[String(day)] ?? EMPTY_DAY;
  const weekday = DOW_LONG[new Date(cal.year, cal.month, day).getDay()];

  const [editing, setEditing] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [label, setLabel] = useState(data.marker?.label ?? '');
  const [busy, setBusy] = useState(false);
  const [postErr, setPostErr] = useState('');
  const [markErr, setMarkErr] = useState('');
  const typeRef = useRef<HTMLInputElement>(null);

  async function commit(next: CcDay, setErr: (m: string) => void, after?: () => void) {
    setBusy(true);
    setErr('');
    try {
      await onSave(day, next);
      after?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const resetForm = () => {
    setEditing(null);
    setType('');
    setNote('');
    setPostErr('');
  };

  function submitPost(e: React.FormEvent) {
    e.preventDefault();
    let t = type.trim();
    if (!t) {
      setPostErr('Type what is being posted, or tap Video, Poster or Carousel.');
      typeRef.current?.focus();
      return;
    }
    t = QUICK_TYPES.find((q) => q.toLowerCase() === t.toLowerCase()) ?? t;
    const posts = editing
      ? data.posts.map((p) => (p.id === editing ? { ...p, type: t, note: note.trim() } : p))
      : [...data.posts, { id: newId(), type: t, note: note.trim() }];
    commit({ ...data, posts }, setPostErr, resetForm);
  }

  function toggleDone(id: string) {
    commit({ ...data, posts: data.posts.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) }, setPostErr);
  }

  function removePost(id: string) {
    commit({ ...data, posts: data.posts.filter((p) => p.id !== id) }, setPostErr, () => {
      if (editing === id) resetForm();
    });
  }

  function submitMarker(e: React.FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l && !data.marker) {
      setMarkErr('Type the name of the special day.');
      return;
    }
    commit({ ...data, marker: l ? { label: l } : null }, setMarkErr, () => !l && setLabel(''));
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} eyebrow={cal.client} title={`${weekday}, ${day} ${MONTHS[cal.month]}`}>
      <section className="flex flex-col gap-3">
        <h3 className="text-[12px] uppercase tracking-[0.72px] text-muted">
          Planned ({data.posts.length})
          {data.posts.some((p) => p.done) && ` · ${data.posts.filter((p) => p.done).length} done`}
        </h3>
        {data.posts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.posts.map((p) => (
              <li key={p.id} className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', p.done ? 'border-emerald-400 bg-emerald-200 text-black' : 'border-border')}>
                {canEdit ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={!!p.done}
                    aria-label={p.done ? `Mark ${p.type} as not done` : `Mark ${p.type} as done`}
                    title={p.done ? 'Done. Click to undo' : 'Mark as done'}
                    onClick={() => toggleDone(p.id)}
                    className={cn(
                      'mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60',
                      p.done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-border text-transparent hover:border-emerald-600 hover:text-emerald-600',
                    )}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                ) : (
                  p.done && (
                    <span aria-label="Done" className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )
                )}
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <TypeDot type={p.type} />
                    <b className={cn('break-words text-[13px] uppercase tracking-[0.3px]', p.done ? 'text-black' : 'text-text')}>{p.type}</b>
                  </span>
                  {p.note && <p className={cn('mt-1 whitespace-pre-wrap break-words text-sm', p.done ? 'text-black/70' : 'text-muted')}>{p.note}</p>}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-3 text-[13px] font-medium">
                    <button
                      type="button"
                      className={cn('underline underline-offset-2', p.done ? 'text-black' : 'text-text')}
                      onClick={() => {
                        setEditing(p.id);
                        setType(p.type);
                        setNote(p.note);
                        setPostErr('');
                        setTimeout(() => typeRef.current?.focus(), 0);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" disabled={busy} className={cn('underline underline-offset-2 disabled:opacity-50', p.done ? 'text-red-800' : 'text-danger')} onClick={() => removePost(p.id)}>
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{canEdit ? 'Nothing planned yet. Add the first post below.' : 'Nothing planned for this day.'}</p>
        )}
        {data.marker && !canEdit && (
          <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            Special day: <b>{data.marker.label}</b>
          </p>
        )}
      </section>

      {canEdit && (
        <>
          <form onSubmit={submitPost} noValidate className="flex flex-col gap-3 border-t border-border pt-5">
            <h3 className="text-[12px] uppercase tracking-[0.72px] text-muted">{editing ? 'Edit post' : 'Add a post'}</h3>
            <Field label="What is it" htmlFor="cc-type">
              <Input
                id="cc-type"
                ref={typeRef}
                value={type}
                maxLength={60}
                autoComplete="off"
                placeholder="Type anything, e.g. GMB, website submission date"
                onChange={(e) => {
                  setType(e.target.value);
                  setPostErr('');
                }}
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map((t) => (
                <Chip
                  key={t}
                  dot={<TypeDot type={t} />}
                  onClick={() => {
                    setType(t);
                    setPostErr('');
                  }}
                >
                  {t}
                </Chip>
              ))}
            </div>
            <Field label="Details (optional)" htmlFor="cc-note">
              <Textarea id="cc-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Caption idea, offer, reference link" />
            </Field>
            {postErr && <ErrorText>{postErr}</ErrorText>}
            <div className="flex justify-end gap-2">
              {editing && (
                <Button variant="secondary" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={busy}>
                {editing ? 'Save changes' : 'Add post'}
              </Button>
            </div>
          </form>

          <form onSubmit={submitMarker} noValidate className="flex flex-col gap-3 border-t border-border pt-5">
            <h3 className="text-[12px] uppercase tracking-[0.72px] text-muted">Special day</h3>
            <Field label="Name" htmlFor="cc-marker">
              <Input
                id="cc-marker"
                value={label}
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. Onam, Valentine's Day, Diwali offer"
                onChange={(e) => {
                  setLabel(e.target.value);
                  setMarkErr('');
                }}
              />
            </Field>
            {markErr && <ErrorText>{markErr}</ErrorText>}
            <div className="flex justify-end gap-2">
              {data.marker && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => commit({ ...data, marker: null }, setMarkErr, () => setLabel(''))}
                >
                  Remove
                </Button>
              )}
              <Button type="submit" variant="secondary" size="sm" disabled={busy}>
                {data.marker ? 'Update special day' : 'Mark as special day'}
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
