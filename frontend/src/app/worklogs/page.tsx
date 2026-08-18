import { NotebookPen } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Input, Select } from '@/components/ui/field';
import { Button, LinkButton } from '@/components/ui/button';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { WorkLogStatusPill } from '@/components/ui/pill';
import { formatDate, formatMinutes } from '@/lib/attendance-format';
import { WorkLogForm, type WorkLog } from './work-log-form';

function zonedToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function rangeFor(preset: string | undefined, from: string | undefined, to: string | undefined, today: string) {
  if (preset === 'custom' && from && to) return { from, to };
  if (preset === 'week') {
    const d = new Date(`${today}T00:00:00`);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return { from: monday.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }
  // default: today
  return { from: today, to: today };
}

export default async function WorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; range?: string; from?: string; to?: string }>;
}) {
  const { token, user } = await requireSession();
  const params = await searchParams;
  const today = zonedToday();
  const editDate = params.date ?? today;
  const preset = params.range ?? 'today';
  const { from, to } = rangeFor(preset, params.from, params.to, today);

  const [logForDate, history] = await Promise.all([
    apiFetch<WorkLog[]>(`/worklogs/me?from=${editDate}&to=${editDate}`, { token }),
    apiFetch<WorkLog[]>(`/worklogs/me?from=${from}&to=${to}`, { token }),
  ]);
  const log = logForDate[0] ?? null;

  return (
    <AppShell user={user}>
      <PageHeader
        title="Daily Work Log"
        icon={NotebookPen}
        tone="purple"
        subtitle="Record what you worked on today — tasks, blockers, hours, and meetings."
      />

      <SectionTitle
        action={
          editDate !== today ? (
            <LinkButton href="/worklogs" variant="ghost" size="sm">
              Back to today
            </LinkButton>
          ) : undefined
        }
      >
        {editDate === today ? "Today's log" : `Log for ${formatDate(editDate)}`}
      </SectionTitle>
      <WorkLogForm date={editDate} log={log} />

      <SectionTitle
        action={
          <form className="flex flex-wrap items-center gap-2">
            <Select name="range" defaultValue={preset} className="py-1.5" style={{ width: 'auto' }}>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </Select>
            <Input type="date" name="from" defaultValue={params.from} className="py-1.5" style={{ width: 'auto' }} />
            <Input type="date" name="to" defaultValue={params.to} className="py-1.5" style={{ width: 'auto' }} />
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        }
      >
        History
      </SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th>Hours</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <tbody>
            {history.map((row) => (
              <Tr key={row.id}>
                <Td>{formatDate(row.date)}</Td>
                <Td className="text-muted">{row.totalHoursWorked ? `${row.totalHoursWorked}h` : '—'}</Td>
                <Td>
                  <WorkLogStatusPill status={row.status} />
                </Td>
                <Td align="right">
                  <LinkButton
                    href={`/worklogs?date=${row.date}`}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {row.status === 'draft' || row.status === 'returned' ? 'Edit' : 'View'}
                  </LinkButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {history.length === 0 && <EmptyState>No work logs in this range yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
