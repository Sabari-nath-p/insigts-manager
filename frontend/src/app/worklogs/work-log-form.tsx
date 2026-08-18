'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Textarea, Input, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { WorkLogStatusPill } from '@/components/ui/pill';

export interface WorkLog {
  id: string;
  date: string;
  tasksCompleted: string;
  blockers: string | null;
  totalHoursWorked: string | null;
  meetingSummary: string | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'returned';
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
}

export function WorkLogForm({ date, log }: { date: string; log: WorkLog | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locked = !!log && log.status !== 'draft' && log.status !== 'returned';
  const loading = saving || submitting;

  function readForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const hours = data.get('totalHoursWorked');
    return {
      date,
      tasksCompleted: String(data.get('tasksCompleted') ?? ''),
      blockers: String(data.get('blockers') ?? '') || undefined,
      totalHoursWorked: hours ? Number(hours) : undefined,
      meetingSummary: String(data.get('meetingSummary') ?? '') || undefined,
    };
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readForm(event.currentTarget)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save draft');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function submitLog(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    setError(null);
    setSubmitting(true);
    try {
      const saveRes = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readForm(form)),
      });
      const saved = await saveRes.json().catch(() => null);
      if (!saveRes.ok) throw new Error(saved?.message || 'Failed to save log before submitting');

      const submitRes = await fetch(`/api/worklogs/${saved.id}/submit`, { method: 'POST' });
      const submitData = await submitRes.json().catch(() => null);
      if (!submitRes.ok) throw new Error(submitData?.message || 'Failed to submit log');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={saveDraft} className="flex flex-col gap-4">
      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted">
          {date}
          {log && (
            <span className="ml-2">
              <WorkLogStatusPill status={log.status} />
            </span>
          )}
        </div>
      </div>

      {log?.status === 'returned' && log.reviewComment && (
        <div className="rounded-md bg-[color:var(--badge-yellow-bg)] px-3 py-2 text-sm text-text">
          <span className="font-medium">Returned for update:</span> {log.reviewComment}
        </div>
      )}
      {log?.status === 'reviewed' && log.reviewComment && (
        <div className="rounded-md bg-[color:var(--badge-green-bg)] px-3 py-2 text-sm text-text">
          <span className="font-medium">Reviewer comment:</span> {log.reviewComment}
        </div>
      )}

      <Field label="Tasks completed today" htmlFor="tasksCompleted" hint="One task per line — bullet points welcome.">
        <Textarea
          id="tasksCompleted"
          name="tasksCompleted"
          required
          disabled={locked}
          defaultValue={log?.tasksCompleted ?? ''}
          className="min-h-32"
          placeholder={'- Fixed login bug\n- Reviewed PR #42\n- Paired with Alex on onboarding flow'}
        />
      </Field>

      <Field label="Blockers or challenges" htmlFor="blockers" hint="Optional — dependencies, delays, support needed.">
        <Textarea id="blockers" name="blockers" disabled={locked} defaultValue={log?.blockers ?? ''} />
      </Field>

      <Field label="Total hours worked" htmlFor="totalHoursWorked">
        <Input
          id="totalHoursWorked"
          name="totalHoursWorked"
          type="number"
          min={0}
          max={24}
          step="0.25"
          disabled={locked}
          defaultValue={log?.totalHoursWorked ?? ''}
        />
      </Field>

      <Field label="Meeting summary" htmlFor="meetingSummary" hint="Optional — meetings, decisions, follow-ups.">
        <Textarea id="meetingSummary" name="meetingSummary" disabled={locked} defaultValue={log?.meetingSummary ?? ''} />
      </Field>

      {!locked && (
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={loading}>
            {saving ? 'Saving…' : 'Save as draft'}
          </Button>
          <Button type="button" onClick={submitLog} disabled={loading}>
            {submitting ? 'Submitting…' : 'Submit daily log'}
          </Button>
        </div>
      )}
      {locked && <p className="text-sm text-muted">This log is read-only until a reviewer reopens it.</p>}
    </form>
  );
}
