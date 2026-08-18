'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export function ApplyLeaveForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      type: form.get('type'),
      startDate: form.get('startDate'),
      endDate: form.get('endDate'),
      reason: form.get('reason'),
    };
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to submit leave request');
      }
      (event.target as HTMLFormElement).reset();
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <ErrorText>{error}</ErrorText>}

      <Field label="Leave type" htmlFor="type">
        <Select id="type" name="type" defaultValue="paid">
          <option value="paid">Paid</option>
          <option value="medical">Medical</option>
          <option value="unpaid">Unpaid (long leave)</option>
        </Select>
      </Field>

      <FieldRow>
        <Field label="Start date" htmlFor="startDate">
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field label="End date" htmlFor="endDate">
          <Input id="endDate" name="endDate" type="date" required />
        </Field>
      </FieldRow>

      <Field label="Reason" htmlFor="reason">
        <Textarea id="reason" name="reason" required />
      </Field>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  );
}
