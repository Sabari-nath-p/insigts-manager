'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import shared from '@/components/shared.module.css';

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
    <div className={shared.card}>
      <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
        Your status
      </p>
      {error && <div className={shared.error}>{error}</div>}
      <div className={shared.buttonRow} style={{ flexWrap: 'wrap' }}>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={loading}
            onClick={() => updateStatus(s.value)}
            className={s.value === status ? shared.button : shared.buttonSecondary}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
