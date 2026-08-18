import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { BarChart3 } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceAnalytics, DailyPoint } from '@/components/attendance-charts';
import { resolveDateRange } from '@/lib/attendance-format';

interface AnalyticsResponse {
  daily: DailyPoint[];
  employeeAttendance: Array<{ userId: string; fullName: string; percentage: number }>;
}

interface WorkLogAnalyticsResponse {
  period: { from: string; to: string };
  totalExpected: number;
  submitted: number;
  pending: number;
  reviewed: number;
  returned: number;
  submissionPercentage: number;
  averageHours: number;
  repeatedMissingEmployees: Array<{ id: string; fullName: string; missingDays: number }>;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string; to?: string; month?: string }>;
}) {
  const { token, user } = await requireSuperAdmin();
  const filters = await searchParams;
  const { from, to } = resolveDateRange(filters);

  const [analytics, workLogAnalytics] = await Promise.all([
    apiFetch<AnalyticsResponse>(`/attendance/admin/analytics?from=${from}&to=${to}`, { token }),
    apiFetch<WorkLogAnalyticsResponse>(`/worklogs/analytics?from=${from}&to=${to}`, { token }),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="Reports" icon={BarChart3} tone="green" subtitle={`Attendance analytics for ${from} to ${to}.`} />
      <AttendanceAnalytics daily={analytics.daily} employeeAttendance={analytics.employeeAttendance} />

      <SectionTitle>Daily Work Log analytics</SectionTitle>
      <MetricStrip className="mb-6">
        <Metric label="Expected" value={workLogAnalytics.totalExpected} />
        <Metric label="Submitted" value={workLogAnalytics.submitted} />
        <Metric label="Pending" value={workLogAnalytics.pending} />
        <Metric label="Reviewed" value={workLogAnalytics.reviewed} />
        <Metric label="Returned" value={workLogAnalytics.returned} />
        <Metric label="Submission rate" value={`${workLogAnalytics.submissionPercentage}%`} />
        <Metric label="Avg. hours logged" value={workLogAnalytics.averageHours} />
      </MetricStrip>

      {workLogAnalytics.repeatedMissingEmployees.length > 0 && (
        <>
          <SectionTitle>Repeated missing submissions</SectionTitle>
          <TableWrap>
            <Table>
              <Thead>
                <Th>Employee</Th>
                <Th align="right">Missing days</Th>
              </Thead>
              <tbody>
                {workLogAnalytics.repeatedMissingEmployees.map((e) => (
                  <Tr key={e.id}>
                    <Td className="font-medium text-text">{e.fullName}</Td>
                    <Td align="right">{e.missingDays}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {workLogAnalytics.repeatedMissingEmployees.length === 0 && <EmptyState>None.</EmptyState>}
          </TableWrap>
        </>
      )}
    </AppShell>
  );
}
