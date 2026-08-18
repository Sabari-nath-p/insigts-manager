'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Textarea, ErrorText } from '@/components/ui/field';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyActivityForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/crm/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: fd.get('date'),
          dials: Number(fd.get('dials') || 0),
          dmsSent: Number(fd.get('dmsSent') || 0),
          conversations: Number(fd.get('conversations') || 0),
          notes: fd.get('notes') || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      {error && <ErrorText>{error}</ErrorText>}
      {saved && !error && (
        <div className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
          Saved.
        </div>
      )}
      <Field label="Date" htmlFor="date">
        <Input id="date" name="date" type="date" defaultValue={today()} required />
      </Field>
      <FieldRow>
        <Field label="Dials" htmlFor="dials">
          <Input id="dials" name="dials" type="number" min={0} defaultValue={0} required />
        </Field>
        <Field label="DMs sent" htmlFor="dmsSent">
          <Input id="dmsSent" name="dmsSent" type="number" min={0} defaultValue={0} required />
        </Field>
      </FieldRow>
      <Field label="Conversations" htmlFor="conversations">
        <Input id="conversations" name="conversations" type="number" min={0} defaultValue={0} required />
      </Field>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} />
      </Field>
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? 'Saving…' : 'Submit'}
      </Button>
    </form>
  );
}
