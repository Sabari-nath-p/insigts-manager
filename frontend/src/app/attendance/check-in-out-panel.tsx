'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import shared from '@/components/shared.module.css';

interface TodayRecord {
  checkInAt: string | null;
  checkOutAt: string | null;
}

export function CheckInOutPanel({ today }: { today: TodayRecord | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger(path: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Request failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const hasCheckedIn = Boolean(today?.checkInAt);
  const hasCheckedOut = Boolean(today?.checkOutAt);

  return (
    <div className={shared.card}>
      {error && <div className={shared.error}>{error}</div>}
      <p className={shared.pageSubtitle} style={{ marginBottom: '0.9rem' }}>
        {!hasCheckedIn && 'You have not checked in today.'}
        {hasCheckedIn && !hasCheckedOut &&
          `Checked in at ${new Date(today!.checkInAt!).toLocaleTimeString()}.`}
        {hasCheckedOut &&
          `Checked in ${new Date(today!.checkInAt!).toLocaleTimeString()} · checked out ${new Date(
            today!.checkOutAt!,
          ).toLocaleTimeString()}. See you tomorrow!`}
      </p>
      <div className={shared.buttonRow}>
        <button
          type="button"
          className={shared.button}
          disabled={loading || hasCheckedIn}
          onClick={() => trigger('/api/attendance/check-in')}
        >
          Check in
        </button>
        <button
          type="button"
          className={shared.buttonSecondary}
          disabled={loading || !hasCheckedIn || hasCheckedOut}
          onClick={() => trigger('/api/attendance/check-out')}
        >
          Check out
        </button>
      </div>
    </div>
  );
}
