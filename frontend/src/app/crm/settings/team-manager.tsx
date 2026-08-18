'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Select, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap } from '@/components/ui/table';
import type { SalesTeamMember } from '../types';

interface UserOption {
  id: string;
  fullName: string;
}

export function TeamManager({ team, users }: { team: SalesTeamMember[]; users: UserOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameById = new Map(users.map((u) => [u.id, u.fullName]));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/crm/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: fd.get('userId'), salesRole: fd.get('salesRole') }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(member: SalesTeamMember) {
    setError(null);
    try {
      const res = await fetch('/api/crm/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, salesRole: member.salesRole, isActive: !member.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } catch {
      setError('Failed to update');
    }
  }

  return (
    <div>
      {error && <ErrorText>{error}</ErrorText>}
      <TableWrap className="mb-3">
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th>Sales role</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {team.map((t) => (
              <Tr key={t.id}>
                <Td>{nameById.get(t.userId) ?? t.userId}</Td>
                <Td className="capitalize">{t.salesRole.replace('_', ' ')}</Td>
                <Td>
                  <button onClick={() => toggleActive(t)} className="text-xs font-medium text-primary hover:text-primary-dark">
                    {t.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-border p-3">
        <FieldRow>
          <Field label="Employee" htmlFor="userId">
            <Select id="userId" name="userId" required>
              <option value="">Select employee</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sales role" htmlFor="salesRole">
            <Select id="salesRole" name="salesRole" defaultValue="setter">
              <option value="setter">Setter</option>
              <option value="closer">Closer</option>
              <option value="sales_manager">Sales Manager</option>
            </Select>
          </Field>
        </FieldRow>
        <Button type="submit" size="sm" disabled={loading} className="self-start">
          Add / update
        </Button>
      </form>
    </div>
  );
}
