'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import shared from '@/components/shared.module.css';

export function ReviewButtons({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: 'approve' | 'reject') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaves/${leaveId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to review request');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className={shared.buttonRow}>
        <button
          type="button"
          className={shared.button}
          disabled={loading}
          onClick={() => review('approve')}
        >
          Approve
        </button>
        <button
          type="button"
          className={shared.buttonDanger}
          disabled={loading}
          onClick={() => review('reject')}
        >
          Reject → unpaid
        </button>
      </div>
      {error && <div className={shared.error} style={{ marginTop: '0.5rem' }}>{error}</div>}
    </div>
  );
}
