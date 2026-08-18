'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckboxLabel, ErrorText } from '@/components/ui/field';
import type { PayrollSettings } from '../types';

export function PayslipToggle({ settings }: { settings: PayrollSettings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payslipEnabled = new FormData(e.currentTarget).get('payslipEnabled') === 'on';
    try {
      const res = await fetch('/api/payroll/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to save');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      {error && <ErrorText>{error}</ErrorText>}
      <CheckboxLabel name="payslipEnabled" defaultChecked={settings.payslipEnabled}>
        Allow employees to view/download payslips for finalized payroll
      </CheckboxLabel>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
