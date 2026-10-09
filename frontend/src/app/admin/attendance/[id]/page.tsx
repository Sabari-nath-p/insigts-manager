import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { LinkButton, Button } from '@/components/ui/button';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceStatusPill } from '@/components/ui/pill';
import { AttendanceMonthCalendar } from '@/components/attendance-month-calendar';
import { formatMinutes, formatScheduledTime, formatTime } from '@/lib/attendance-format';
import { EditAttendanceButton } from '../edit-attendance-button';

interface AttendanceDayView {
  recordId: string | null;
  date: string;
  scheduledStartTime: string | null;
  checkInAt: string | null;
  lateMinutes: number;
  scheduledEndTime: string | null;
  checkOutAt: string | null;
  earlyCheckoutMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  status: string;
  holidayName?: string;
  holidayType?: string;
}

interface EmployeeDetail {
  user: { id: string; fullName: string; email: string; role: string; department: string | null; designation: string | null };
  month: string;
  stats: {
    totalCalendarDays: number;
    workingDays: number;
    holidays: number;
    weeklyOffs: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    halfDayDays: number;
    lateDays: number;
    earlyCheckoutDays: number;
    holidayWorkedDays: number;
    weekOffWorkedDays: number;
    totalWorkedMinutes: number;
    averageDailyMinutes: number;
    totalOvertimeMinutes: number;
    totalLateMinutes: number;
    totalEarlyCheckoutMinutes: number;
    attendancePercentage: number;
  };
  history: AttendanceDayView[];
}

export default async function EmployeeAttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { token, user } = await requireSuperAdmin();
  const { id } = await params;
  const { month } = await searchParams;

  let detail: EmployeeDetail;
  try {
    detail = await apiFetch<EmployeeDetail>(`/attendance/admin/employees/${id}${month ? `?month=${month}` : ''}`, {
      token,
    });
  } catch {
    notFound();
  }

  return (
    <AppShell user={user} title={detail.user.fullName}>
      <PageHeader
        title={detail.user.fullName}
        subtitle={
          <>
            {detail.user.email}
            {detail.user.designation ? ` · ${detail.user.designation}` : ''}
            {detail.user.department ? ` · ${detail.user.department}` : ''}
          </>
        }
        actions={
          <LinkButton href={`/admin/users/${detail.user.id}`} variant="secondary" size="sm">
            Employee profile
          </LinkButton>
        }
      />

      <form className="mb-6 flex items-end gap-2.5">
        <input
          name="month"
          type="month"
          defaultValue={detail.month}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none"
        />
        <Button type="submit" variant="secondary" size="sm">
          View
        </Button>
      </form>

      <MetricStrip className="mb-8">
        <Metric label="Calendar days" value={detail.stats.totalCalendarDays} />
        <Metric label="Working days" value={detail.stats.workingDays} />
        <Metric label="Holidays" value={detail.stats.holidays} />
        <Metric label="Weekly offs" value={detail.stats.weeklyOffs} />
        <Metric label="Present" value={detail.stats.presentDays} />
        <Metric label="Absent" value={detail.stats.absentDays} />
        <Metric label="Leave" value={detail.stats.leaveDays} />
        <Metric label="Half day" value={detail.stats.halfDayDays} />
        <Metric label="Late days" value={detail.stats.lateDays} />
        <Metric label="Early checkout days" value={detail.stats.earlyCheckoutDays} />
        <Metric label="Holiday worked" value={detail.stats.holidayWorkedDays} />
        <Metric label="Week off worked" value={detail.stats.weekOffWorkedDays} />
        <Metric label="Total worked" value={formatMinutes(detail.stats.totalWorkedMinutes)} />
        <Metric label="Average daily" value={formatMinutes(detail.stats.averageDailyMinutes)} />
        <Metric label="Total overtime" value={formatMinutes(detail.stats.totalOvertimeMinutes)} />
        <Metric label="Total late" value={formatMinutes(detail.stats.totalLateMinutes)} />
        <Metric label="Total early checkout" value={formatMinutes(detail.stats.totalEarlyCheckoutMinutes)} />
        <Metric label="Attendance %" value={`${detail.stats.attendancePercentage}%`} />
      </MetricStrip>

      <div className="mt-8">
        <AttendanceMonthCalendar month={detail.month} history={detail.history} />
      </div>

      <SectionTitle>Attendance history — {detail.month}</SectionTitle>
      <TableWrap>
        <Table>
          <Thead sticky>
            <Th>Date</Th>
            <Th>Scheduled in</Th>
            <Th>Clock in</Th>
            <Th>Late</Th>
            <Th>Scheduled out</Th>
            <Th>Clock out</Th>
            <Th>Early</Th>
            <Th>Break</Th>
            <Th>Worked</Th>
            <Th>Overtime</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <tbody>
            {detail.history.map((r) => (
              <Tr key={r.date}>
                <Td>{r.date}</Td>
                <Td className="text-muted">{formatScheduledTime(r.scheduledStartTime)}</Td>
                <Td>{formatTime(r.checkInAt)}</Td>
                <Td className="text-muted">{r.lateMinutes > 0 ? formatMinutes(r.lateMinutes) : 'No'}</Td>
                <Td className="text-muted">{formatScheduledTime(r.scheduledEndTime)}</Td>
                <Td>{formatTime(r.checkOutAt)}</Td>
                <Td className="text-muted">{r.earlyCheckoutMinutes > 0 ? formatMinutes(r.earlyCheckoutMinutes) : 'No'}</Td>
                <Td className="text-muted">{formatMinutes(r.breakMinutes)}</Td>
                <Td>{formatMinutes(r.workedMinutes)}</Td>
                <Td className="text-muted">{formatMinutes(r.overtimeMinutes)}</Td>
                <Td>
                  <AttendanceStatusPill status={r.status} />
                </Td>
                <Td align="right">
                  {r.recordId && (
                    <EditAttendanceButton
                      recordId={r.recordId}
                      date={r.date}
                      checkInAt={r.checkInAt}
                      checkOutAt={r.checkOutAt}
                      breakMinutes={r.breakMinutes}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {detail.history.length === 0 && <EmptyState>No attendance records for this month.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
