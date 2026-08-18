'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, ErrorText } from '@/components/ui/field';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function GoalForm({ currentGoal }: { currentGoal: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/crm/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: fd.get('period'), revenueGoalAmount: Number(fd.get('revenueGoalAmount')) }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-border p-3">
      {error && <ErrorText>{error}</ErrorText>}
      {currentGoal != null && <p className="text-sm text-muted">Current goal for this month: ₹{currentGoal.toLocaleString('en-IN')}</p>}
      <FieldRow>
        <Field label="Month" htmlFor="period">
          <Input id="period" name="period" type="month" defaultValue={currentMonth()} required />
        </Field>
        <Field label="Revenue goal (₹)" htmlFor="revenueGoalAmount">
          <Input id="revenueGoalAmount" name="revenueGoalAmount" type="number" min={0} step="1" required />
        </Field>
      </FieldRow>
      <Button type="submit" size="sm" disabled={loading} className="self-start">
        Save goal
      </Button>
    </form>
  );
}
