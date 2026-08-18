import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { ClipboardList } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { LinkButton, Button } from '@/components/ui/button';
import { Field, Select, CheckboxLabel } from '@/components/ui/field';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceStatusPill } from '@/components/ui/pill';
import {
  formatMinutes,
  formatScheduledTime,
  formatTime,
  statusLabel,
} from '@/lib/attendance-format';
import { EditAttendanceButton } from './edit-attendance-button';
import { DateRangeFilter } from './date-range-filter';

interface UserSummary {
  id: string;
  fullName: string;
  role: string;
  department: string | null;
}

interface AdminSummary {
  totalEmployees: number;
  presentToday: number;
  currentlyWorking: number;
  lateToday: number;
  earlyCheckoutToday: number;
  absentToday: number;
  onLeaveToday: number;
  overtimeToday: { count: number; totalMinutes: number };
}

interface AdminRecordRow {
  recordId: string | null;
  userId: string;
  fullName: string;
  role: string;
  department: string | null;
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

interface Filters {
  employeeId?: string;
  department?: string;
  role?: string;
  date?: string;
  from?: string;
  to?: string;
  month?: string;
  status?: string;
  onlyLate?: string;
  onlyEarlyCheckout?: string;
  onlyOvertime?: string;
  onlyCurrentlyWorking?: string;
}

export default async function AdminAttendancePage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { token, user } = await requireSuperAdmin();
  const filters = await searchParams;

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query.set(k, v);
  });

  const [employees, summary, records] = await Promise.all([
    apiFetch<UserSummary[]>('/users', { token }),
    apiFetch<AdminSummary>(`/attendance/admin/summary${filters.date ? `?date=${filters.date}` : ''}`, { token }),
    apiFetch<AdminRecordRow[]>(`/attendance/admin/records?${query.toString()}`, { token }),
  ]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter((d): d is string => !!d)));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Attendance"
        icon={ClipboardList}
        tone="teal"
        subtitle="Company-wide attendance tracking."
        actions={
          <LinkButton href="/admin/attendance/settings" variant="secondary" size="sm">
            Working hours &amp; holidays
          </LinkButton>
        }
      />

      <MetricStrip className="mb-8">
        <Metric label="Total employees" value={summary.totalEmployees} />
        <Metric label="Present today" value={summary.presentToday} />
        <Metric label="Currently working" value={summary.currentlyWorking} />
        <Metric label="Late today" value={summary.lateToday} />
        <Metric label="Early checkout" value={summary.earlyCheckoutToday} />
        <Metric label="Absent today" value={summary.absentToday} />
        <Metric label="On leave" value={summary.onLeaveToday} />
        <Metric label="Overtime" value={`${summary.overtimeToday.count} · ${formatMinutes(summary.overtimeToday.totalMinutes)}`} />
      </MetricStrip>

      <SectionTitle>Filters</SectionTitle>
      <form className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Employee" htmlFor="employeeId">
            <Select id="employeeId" name="employeeId" defaultValue={filters.employeeId ?? ''}>
              <option value="">All employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" htmlFor="department">
            <Select id="department" name="department" defaultValue={filters.department ?? ''}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role" htmlFor="role">
            <Select id="role" name="role" defaultValue={filters.role ?? ''}>
              <option value="">All roles</option>
              <option value="employee">Employee</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ''}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
          <DateRangeFilter date={filters.date} month={filters.month} from={filters.from} to={filters.to} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted">Only show:</span>
            <CheckboxLabel name="onlyLate" value="true" defaultChecked={filters.onlyLate === 'true'}>
              Late
            </CheckboxLabel>
            <CheckboxLabel name="onlyEarlyCheckout" value="true" defaultChecked={filters.onlyEarlyCheckout === 'true'}>
              Early checkout
            </CheckboxLabel>
            <CheckboxLabel name="onlyOvertime" value="true" defaultChecked={filters.onlyOvertime === 'true'}>
              Overtime
            </CheckboxLabel>
            <CheckboxLabel name="onlyCurrentlyWorking" value="true" defaultChecked={filters.onlyCurrentlyWorking === 'true'}>
              Working now
            </CheckboxLabel>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <LinkButton href="/admin/attendance" variant="ghost" size="sm">
                Clear
              </LinkButton>
            )}
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </div>
      </form>

      <SectionTitle>{records.length} record(s)</SectionTitle>
      <TableWrap>
        <Table>
          <Thead sticky>
            <Th>Employee</Th>
            <Th>Role</Th>
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
            {records.map((r) => (
              <Tr key={`${r.userId}:${r.date}`}>
                <Td>
                  <Link href={`/admin/attendance/${r.userId}`} className="font-medium text-text hover:text-primary">
                    {r.fullName}
                  </Link>
                </Td>
                <Td className="capitalize text-muted">{r.role.replace('_', ' ')}</Td>
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
                <Td align="right">{r.recordId && (
                  <EditAttendanceButton
                    recordId={r.recordId}
                    date={r.date}
                    checkInAt={r.checkInAt}
                    checkOutAt={r.checkOutAt}
                    breakMinutes={r.breakMinutes}
                  />
                )}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {records.length === 0 && <EmptyState>No attendance records match these filters.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
