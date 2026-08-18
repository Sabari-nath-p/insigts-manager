'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap } from '@/components/ui/table';
import type { LeadSource } from '../types';

export function SourcesManager({ sources }: { sources: LeadSource[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleActive(source: LeadSource) {
    setError(null);
    try {
      const res = await fetch(`/api/crm/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: source.name, isActive: !source.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      router.refresh();
    } catch {
      setError('Failed to update source');
    }
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/crm/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fd.get('name') }),
      });
      if (!res.ok) throw new Error('Failed to add source');
      e.currentTarget.reset();
      router.refresh();
    } catch {
      setError('Failed to add source');
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
            <Th>Name</Th>
            <Th>Active</Th>
          </Thead>
          <tbody>
            {sources.map((s) => (
              <Tr key={s.id}>
                <Td>{s.name}</Td>
                <Td>
                  <CheckboxLabel checked={s.isActive} onChange={() => toggleActive(s)}>
                    Active
                  </CheckboxLabel>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input name="name" placeholder="e.g. LinkedIn Ads" required className="w-auto" />
        <Button type="submit" size="sm" disabled={loading}>
          Add source
        </Button>
      </form>
    </div>
  );
}
