'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';

export function ReviewButtons({ leaveId, onDone }: { leaveId: string; onDone?: () => void }) {
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
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <Button size="sm" disabled={loading} onClick={() => review('approve')}>
          Approve
        </Button>
        <Button size="sm" variant="danger" disabled={loading} onClick={() => review('reject')}>
          Reject → unpaid
        </Button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </div>
  );
}
