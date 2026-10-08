'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { ErrorText } from '@/components/ui/field';

const STATUSES = [
  { value: 'working', label: 'Working' },
  { value: 'in_meeting', label: 'In a meeting' },
  { value: 'on_break', label: 'On a break' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'offline', label: 'Offline' },
];

export function StatusSelector({ current }: { current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(next: string) {
    setStatus(next);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update status');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-medium text-muted">Your status</p>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={loading}
            onClick={() => updateStatus(s.value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
              s.value === status
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border text-text hover:bg-black/[0.03] dark:hover:bg-white/[0.06]',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
