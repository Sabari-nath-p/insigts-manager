'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Avatar } from '@/components/ui/avatar';
import type { ClientTeamMember } from '../../types';
import type { Employee } from '../client-workspace';

export function TeamTab({
  team,
  clientId,
  canManage,
  employees,
}: {
  team: ClientTeamMember[];
  clientId: string;
  canManage: boolean;
  employees: Employee[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const assignedIds = new Set(team.map((t) => t.userId));
  const available = employees.filter((e) => !assignedIds.has(e.id));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      userId: form.get('userId'),
      role: form.get('role'),
      responsibility: form.get('responsibility') || undefined,
      assignedDate: form.get('assignedDate') || undefined,
    };
    try {
      const res = await fetch(`/api/clients/${clientId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to assign employee');
      router.refresh();
      setAssigning(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!window.confirm('Remove this employee from the client team?')) return;
    await fetch(`/api/clients/${clientId}/team/${memberId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Everyone currently working on this client.</p>
        {canManage && (
          <Button size="sm" onClick={() => setAssigning(true)}>
            <Plus size={14} /> Assign Employee
          </Button>
        )}
      </div>

      <TableWrap>
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th>Role</Th>
            <Th>Responsibility</Th>
            <Th>Assigned</Th>
            <Th>Workload</Th>
            {canManage && <Th />}
          </Thead>
          <tbody>
            {team.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={t.fullName} size="sm" />
                    <span className="font-medium text-text">{t.fullName}</span>
                  </div>
                </Td>
                <Td className="text-muted">{t.role}</Td>
                <Td className="text-muted">{t.responsibility ?? '—'}</Td>
                <Td className="text-muted">{t.assignedDate ?? '—'}</Td>
                <Td className="text-muted">Not tracked yet</Td>
                {canManage && (
                  <Td align="right">
                    <button type="button" onClick={() => handleRemove(t.id)} className="text-muted hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
        {team.length === 0 && <EmptyState>No one has been assigned to this client yet.</EmptyState>}
      </TableWrap>

      <Panel open={assigning} onOpenChange={setAssigning} title="Assign employee">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Employee" htmlFor="userId">
            <Select id="userId" name="userId" required>
              <option value="">Select an employee</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <FieldRow>
            <Field label="Role" htmlFor="role" hint="e.g. Designer, Video Editor, Account Manager">
              <Input id="role" name="role" required />
            </Field>
            <Field label="Assigned date" htmlFor="assignedDate">
              <Input id="assignedDate" name="assignedDate" type="date" />
            </Field>
          </FieldRow>
          <Field label="Responsibility" htmlFor="responsibility">
            <Textarea id="responsibility" name="responsibility" className="min-h-16" />
          </Field>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Assigning…' : 'Assign employee'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
