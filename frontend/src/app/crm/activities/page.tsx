import { NotebookPen } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import type { DailySalesActivity } from '../types';
import { DailyActivityForm } from './daily-activity-form';

export default async function DailyActivityPage() {
  const { token, user } = await requireSession();
  const entries = await apiFetch<DailySalesActivity[]>('/crm/daily-activity/mine', { token });

  return (
    <AppShell user={user}>
      <PageHeader title="Daily Activity" icon={NotebookPen} tone="teal" subtitle="Today's dials, DMs and conversations — under 30 seconds." />

      <div className="mb-8 max-w-md">
        <DailyActivityForm />
      </div>

      <SectionTitle>Recent entries</SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th align="right">Dials</Th>
            <Th align="right">DMs sent</Th>
            <Th align="right">Conversations</Th>
            <Th>Notes</Th>
          </Thead>
          <tbody>
            {entries.map((e) => (
              <Tr key={e.id}>
                <Td>{e.date}</Td>
                <Td align="right">{e.dials}</Td>
                <Td align="right">{e.dmsSent}</Td>
                <Td align="right">{e.conversations}</Td>
                <Td className="text-muted">{e.notes ?? '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {entries.length === 0 && <EmptyState>No entries yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
