import { Clock } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { AttendanceTimer } from '@/components/attendance-timer';
import { AttendanceMonthCalendar } from '@/components/attendance-month-calendar';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Select } from '@/components/ui/field';
import { Button, LinkButton } from '@/components/ui/button';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceStatusPill } from '@/components/ui/pill';
import { formatDate, formatMinutes, formatScheduledTime, formatTime, statusLabel } from '@/lib/attendance-format';

interface TodayRecord {
  checkInAt: string | null;
  checkOutAt: string | null;
  breakStartAt: string | null;
  totalBreakMinutes: number;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  requiredMinutes: number | null;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  overtimeMinutes: number;
  status: string;
}

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

const STATUS_OPTIONS = [
  'present',
  'late',
  'early_checkout',
  'late_and_early_checkout',
  'half_day',
  'currently_working',
  'not_checked_out',
  'absent',
  'on_leave',
  'weekend',
  'holiday',
  'holiday_worked',
  'week_off_worked',
];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  const { token, user } = await requireSession();
  const { month, status } = await searchParams;

  const query = new URLSearchParams();
  if (month) query.set('month', month);
  if (status) query.set('status', status);
  const historyPath = `/attendance/me${query.toString() ? `?${query.toString()}` : ''}`;

  const [today, history] = await Promise.all([
    apiFetch<TodayRecord | null>('/attendance/me/today', { token }),
    apiFetch<AttendanceDayView[]>(historyPath, { token }),
  ]);

  const currentMonth = month ?? new Date().toISOString().slice(0, 7);

  return (
    <AppShell user={user}>
      <PageHeader title="Attendance" icon={Clock} tone="teal" subtitle="Check in when you start, check out when you're done." />

      <SectionTitle>Today&rsquo;s attendance</SectionTitle>
      <AttendanceTimer today={today} />

      <SectionTitle>Calendar — {currentMonth}</SectionTitle>
      <AttendanceMonthCalendar month={currentMonth} history={history} />

      <SectionTitle
        action={
          <form className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none"
            />
            <Select name="status" defaultValue={status ?? ''} className="w-auto py-1.5">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
            {(month || status) && (
              <LinkButton href="/attendance" variant="ghost" size="sm">
                Clear
              </LinkButton>
            )}
          </form>
        }
      >
        History
      </SectionTitle>
      <TableWrap>
        <Table>
          <Thead sticky>
            <Th>Date</Th>
            <Th>Scheduled in</Th>
            <Th>Check-in</Th>
            <Th>Late</Th>
            <Th>Scheduled out</Th>
            <Th>Check-out</Th>
            <Th>Early checkout</Th>
            <Th>Break</Th>
            <Th>Worked</Th>
            <Th>Overtime</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {history.map((r) => (
              <Tr key={r.date}>
                <Td>{formatDate(r.date)}</Td>
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
              </Tr>
            ))}
          </tbody>
        </Table>
        {history.length === 0 && <EmptyState>No attendance records yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
