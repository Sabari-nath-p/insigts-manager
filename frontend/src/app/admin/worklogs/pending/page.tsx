import { UserSearch } from 'lucide-react';
import { requireReviewer } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import { formatDate } from '@/lib/attendance-format';

interface PendingResult {
  date: string;
  totalRequired: number;
  submittedCount: number;
  pendingCount: number;
  pending: Array<{ id: string; fullName: string; department: string | null; lastSubmittedDate: string | null }>;
}

function zonedToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PendingSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { token, user } = await requireReviewer();
  const { date } = await searchParams;
  const targetDate = date ?? zonedToday();

  const result = await apiFetch<PendingResult>(`/worklogs/pending?date=${targetDate}`, { token });

  return (
    <AppShell user={user}>
      <PageHeader
        title="Pending Submissions"
        icon={UserSearch}
        tone="pink"
        subtitle={`Who hasn't filed their Daily Work Log for ${formatDate(result.date)} yet.`}
      />

      <form className="mb-6 flex items-end gap-2.5">
        <Input type="date" name="date" defaultValue={targetDate} className="py-1.5" style={{ width: 'auto' }} />
        <Button type="submit" variant="secondary" size="sm">
          Check date
        </Button>
      </form>

      <MetricStrip className="mb-8">
        <Metric label="Required today" value={result.totalRequired} />
        <Metric label="Submitted" value={result.submittedCount} />
        <Metric label="Pending" value={result.pendingCount} />
      </MetricStrip>

      <SectionTitle>{result.pendingCount} employee(s) pending</SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th>Department</Th>
            <Th>Last submitted</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {result.pending.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-text">{p.fullName}</Td>
                <Td className="text-muted">{p.department ?? '—'}</Td>
                <Td className="text-muted">{p.lastSubmittedDate ? formatDate(p.lastSubmittedDate) : 'Never'}</Td>
                <Td>
                  <Pill tone={p.lastSubmittedDate ? 'badgeYellow' : 'badgeRed'}>
                    {p.lastSubmittedDate ? 'Pending' : 'Never submitted'}
                  </Pill>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {result.pending.length === 0 && <EmptyState>Everyone required to log work today has submitted. Nice.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
