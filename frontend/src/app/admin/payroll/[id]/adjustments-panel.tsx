'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import type { PayrollAdjustment } from '../types';

const TYPES = ['bonus', 'incentive', 'deduction', 'reimbursement', 'advance_recovery', 'other'];
const DEDUCTING = new Set(['deduction', 'advance_recovery']);

export function AdjustmentsPanel({
  recordId,
  adjustments,
  locked,
}: {
  recordId: string;
  adjustments: PayrollAdjustment[];
  locked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/payroll/admin/records/${recordId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.get('type'),
          amount: Number(form.get('amount')),
          reason: form.get('reason'),
          isEmployeeVisible: form.get('isEmployeeVisible') === 'on',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to add adjustment');
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(adjustmentId: string) {
    if (!window.confirm('Remove this adjustment?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/payroll/admin/records/${recordId}/adjustments/${adjustmentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to remove adjustment');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div>
      {error && <ErrorText>{error}</ErrorText>}
      <TableWrap className="mb-3">
        <Table>
          <Thead>
            <Th>Type</Th>
            <Th>Reason</Th>
            <Th align="right">Amount</Th>
            <Th>Employee visible</Th>
            <Th />
          </Thead>
          <tbody>
            {adjustments.map((a) => (
              <Tr key={a.id}>
                <Td className="capitalize">{a.type.replace('_', ' ')}</Td>
                <Td className="text-muted">{a.reason}</Td>
                <Td align="right" className={DEDUCTING.has(a.type) ? 'text-danger' : ''}>
                  {DEDUCTING.has(a.type) ? '−' : '+'}₹{Number(a.amount).toLocaleString('en-IN')}
                </Td>
                <Td className="text-muted">{a.isEmployeeVisible ? 'Yes' : 'No'}</Td>
                <Td align="right">
                  {!locked && (
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-muted transition-colors hover:text-danger"
                      title="Remove adjustment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {adjustments.length === 0 && <EmptyState>No adjustments yet.</EmptyState>}
      </TableWrap>

      {!locked && !showForm && (
        <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
          Add adjustment
        </Button>
      )}

      {!locked && showForm && (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <FieldRow>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue="bonus" required>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (₹)" htmlFor="amount">
              <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
            </Field>
          </FieldRow>
          <Field label="Reason" htmlFor="reason">
            <Textarea id="reason" name="reason" required rows={2} />
          </Field>
          <CheckboxLabel name="isEmployeeVisible">Show to employee (on My Payroll and payslip)</CheckboxLabel>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Adding…' : 'Add adjustment'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
