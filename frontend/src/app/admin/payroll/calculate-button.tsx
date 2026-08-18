'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';

export function CalculateButton({ month }: { month: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch('/api/payroll/admin/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to calculate payroll');
      }
      setSummary(`Calculated ${data.calculated.length} record(s)${data.skipped.length ? `, skipped ${data.skipped.length}` : ''}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button size="sm" onClick={handleClick} disabled={loading}>
        {loading ? 'Calculating…' : 'Calculate / Recalculate'}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
      {summary && !error && <p className="text-xs text-muted">{summary}</p>}
    </div>
  );
}
