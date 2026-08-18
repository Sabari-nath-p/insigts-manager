'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckboxLabel, Input, ErrorText } from '@/components/ui/field';
import { Tr, Td } from '@/components/ui/table';
import type { LeavePayrollRule } from '../types';

export function LeaveRuleRow({ rule }: { rule: LeavePayrollRule }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/payroll/admin/leave-rules/${rule.leaveType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPayable: form.get('isPayable') === 'on',
          payableFraction: Number(form.get('payableFraction')),
        }),
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
    <Tr>
      <Td className="font-medium capitalize text-text">{rule.leaveType}</Td>
      <Td>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          {error && <ErrorText>{error}</ErrorText>}
          <CheckboxLabel name="isPayable" defaultChecked={rule.isPayable}>
            Payable
          </CheckboxLabel>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            Fraction of a day paid
            <Input
              name="payableFraction"
              type="number"
              min={0}
              max={1}
              step="0.05"
              defaultValue={rule.payableFraction}
              className="w-20 py-1"
            />
          </label>
          <Button type="submit" size="sm" variant="secondary" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Td>
    </Tr>
  );
}
