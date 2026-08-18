'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';
import { Holiday, holidayTypeBadgeKey, holidayTypeLabel } from './holiday-types';
import { HolidayForm } from './holiday-form';

export function HolidayList({ holidays, departments }: { holidays: Holiday[]; departments: string[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this holiday? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/holidays/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to delete holiday');
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
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <TableWrap>
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Paid</Th>
            <Th>Optional</Th>
            <Th>Applicable to</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <tbody>
            {holidays.map((h) => (
              <Fragment key={h.id}>
                <Tr>
                  <Td>
                    {h.date}
                    {h.isTentative ? ' (tentative)' : ''}
                  </Td>
                  <Td className="font-medium text-text">{h.name}</Td>
                  <Td>
                    <Pill tone={holidayTypeBadgeKey(h.type)}>{holidayTypeLabel(h.type)}</Pill>
                  </Td>
                  <Td className="text-muted">{h.isPaid ? 'Paid' : 'Unpaid'}</Td>
                  <Td className="text-muted">{h.isOptional ? 'Optional' : 'Compulsory'}</Td>
                  <Td className="text-muted">{h.applicableDepartments?.length ? h.applicableDepartments.join(', ') : 'All'}</Td>
                  <Td>
                    <Pill tone={h.isActive ? 'badgeGreen' : 'badgeGray'}>{h.isActive ? 'Active' : 'Inactive'}</Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(editingId === h.id ? null : h.id)}>
                        {editingId === h.id ? 'Close' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="danger" disabled={loading} onClick={() => handleDelete(h.id)}>
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
                {editingId === h.id && (
                  <tr>
                    <td colSpan={8}>
                      <HolidayForm holiday={h} departments={departments} onDone={() => setEditingId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
        {holidays.length === 0 && <EmptyState>No holidays configured.</EmptyState>}
      </TableWrap>
    </div>
  );
}
