'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import shared from '@/components/shared.module.css';

export function ApplyLeaveForm() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={shared.card}>
      {error && <div className={shared.error}>{error}</div>}
      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="type">
            Leave type
          </label>
          <select id="type" name="type" className={shared.select} defaultValue="paid">
            <option value="paid">Paid</option>
            <option value="medical">Medical</option>
            <option value="unpaid">Unpaid (long leave)</option>
          </select>
        </div>
      </div>
      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="startDate">
            Start date
          </label>
          <input id="startDate" name="startDate" type="date" className={shared.input} required />
        </div>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="endDate">
            End date
          </label>
          <input id="endDate" name="endDate" type="date" className={shared.input} required />
        </div>
      </div>
      <div className={shared.field}>
        <label className={shared.label} htmlFor="reason">
          Reason
        </label>
        <textarea id="reason" name="reason" className={shared.textarea} required />
      </div>
      <button type="submit" className={shared.button} disabled={loading}>
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
