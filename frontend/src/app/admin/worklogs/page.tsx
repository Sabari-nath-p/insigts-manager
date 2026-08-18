import { ClipboardCheck } from 'lucide-react';
import { requireReviewer } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Input } from '@/components/ui/field';
import { Button, LinkButton } from '@/components/ui/button';
import { resolveDateRange } from '@/lib/attendance-format';
import { WorkLogReviewClient, type ReviewableWorkLog } from './worklog-review-client';

export default async function AdminWorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; month?: string }>;
}) {
  const { token, user } = await requireReviewer();
  const filters = await searchParams;
  const { from, to } = resolveDateRange(filters);

  const logs = await apiFetch<ReviewableWorkLog[]>(`/worklogs/team?from=${from}&to=${to}`, { token });

  return (
    <AppShell user={user}>
      <PageHeader
        title="Review Work Logs"
        icon={ClipboardCheck}
        tone="teal"
        subtitle={`Daily work logs submitted between ${from} and ${to}.`}
      />

      <SectionTitle>Date range</SectionTitle>
      <form className="mb-6 flex flex-wrap items-end gap-2.5">
        <Input name="from" type="date" defaultValue={from} className="py-1.5" style={{ width: 'auto' }} title="From" />
        <Input name="to" type="date" defaultValue={to} className="py-1.5" style={{ width: 'auto' }} title="To" />
        <Button type="submit" size="sm">
          Apply
        </Button>
        {(filters.from || filters.to || filters.month) && (
          <LinkButton href="/admin/worklogs" variant="ghost" size="sm">
            Clear
          </LinkButton>
        )}
      </form>

      <WorkLogReviewClient logs={logs} />
    </AppShell>
  );
}
