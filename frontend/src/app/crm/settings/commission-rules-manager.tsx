'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Select, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap } from '@/components/ui/table';
import type { CommissionRule } from '../types';

interface UserOption {
  id: string;
  fullName: string;
}

export function CommissionRulesManager({ rules, closers }: { rules: CommissionRule[]; closers: UserOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameById = new Map(closers.map((c) => [c.id, c.fullName]));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const scope = fd.get('scope') as string;
    try {
      const res = await fetch('/api/crm/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          salesRole: scope === 'role' ? 'closer' : undefined,
          userId: scope === 'employee' ? fd.get('userId') : undefined,
          percent: Number(fd.get('percent')),
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
    <div>
      {error && <ErrorText>{error}</ErrorText>}
      <TableWrap className="mb-3">
        <Table>
          <Thead>
            <Th>Scope</Th>
            <Th>Applies to</Th>
            <Th align="right">Percent</Th>
          </Thead>
          <tbody>
            {rules.map((r) => (
              <Tr key={r.id}>
                <Td className="capitalize">{r.scope}</Td>
                <Td className="text-muted">
                  {r.scope === 'default' ? 'Company default' : r.scope === 'role' ? 'All closers' : r.userId ? nameById.get(r.userId) ?? r.userId : '—'}
                </Td>
                <Td align="right">{r.percent}%</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-border p-3">
        <FieldRow>
          <Field label="Scope" htmlFor="scope">
            <Select id="scope" name="scope" defaultValue="default">
              <option value="default">Default (company-wide)</option>
              <option value="role">Role (all closers)</option>
              <option value="employee">Specific employee</option>
            </Select>
          </Field>
          <Field label="Percent" htmlFor="percent">
            <Input id="percent" name="percent" type="number" min={0} max={100} step="0.01" required />
          </Field>
        </FieldRow>
        <Field label="Employee (only for employee scope)" htmlFor="userId">
          <Select id="userId" name="userId" defaultValue="">
            <option value="">—</option>
            {closers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="sm" disabled={loading} className="self-start">
          Save rule
        </Button>
      </form>
    </div>
  );
}
