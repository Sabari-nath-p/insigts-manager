'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Search } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { ErrorText } from '@/components/ui/field';
import { CreateUserForm, type EditableUser } from './new/create-user-form';

export interface UserSummary extends EditableUser {
  currentStatus: string;
}

type SortKey = 'fullName' | 'role' | 'currentStatus';

export function EmployeeTable({
  employees,
  managers,
}: {
  employees: UserSummary[];
  managers: { id: string; fullName: string; role: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? employees.filter((e) => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      : employees;
    return [...filtered].sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  }, [employees, query, sortKey]);

  async function handleDelete(e: UserSummary) {
    if (!window.confirm(`Deactivate ${e.fullName}? They will no longer be able to log in, but their attendance, leave, and work log history is kept.`)) {
      return;
    }
    setDeletingId(e.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${e.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to deactivate account');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees"
            className="w-44 bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none"
        >
          <option value="fullName">Sort: Name</option>
          <option value="role">Sort: Role</option>
          <option value="currentStatus">Sort: Status</option>
        </select>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted">
          <ArrowUpDown size={12} />
          {rows.length} shown
        </span>
      </div>

      <TableWrap>
        <Table>
          <Thead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Working type</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.fullName} size="sm" />
                    <span className="font-medium text-text">{e.fullName}</span>
                  </div>
                </Td>
                <Td className="text-muted">{e.email}</Td>
                <Td>
                  <Pill tone="badgeGray">{e.role.replace('_', ' ')}</Pill>
                </Td>
                <Td className="capitalize text-muted">{e.workingType}</Td>
                <Td>
                  {e.isActive ? (
                    <span className="capitalize text-muted">{e.currentStatus.replace('_', ' ')}</span>
                  ) : (
                    <Pill tone="badgeGray">Deactivated</Pill>
                  )}
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
                      className="text-sm font-medium text-muted hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === e.id}
                      onClick={() => handleDelete(e)}
                      className="text-sm font-medium text-muted hover:text-danger disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <Link href={`/admin/users/${e.id}`} className="text-sm font-medium text-muted hover:text-primary">
                      View
                    </Link>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {rows.length === 0 && <EmptyState>No accounts match your search.</EmptyState>}
      </TableWrap>

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit account" description="Update this employee's details.">
        {editing && <CreateUserForm user={editing} managers={managers} onSuccess={() => setEditing(null)} />}
      </Panel>
    </div>
  );
}
