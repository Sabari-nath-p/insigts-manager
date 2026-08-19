import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { ClipboardList } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { LinkButton, Button } from '@/components/ui/button';
import { Field, Select, Input, CheckboxLabel } from '@/components/ui/field';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { formatMinutes, statusLabel, todayIST, currentMonthIST } from '@/lib/attendance-format';
import { DateRangeFilter } from './date-range-filter';
import { AttendanceTabNav } from './attendance-tab-nav';
import { Pager } from './pager';
import { OverviewSection, type OverviewRow } from './overview-section';
import { AttendanceMatrix, type MatrixRow } from './attendance-matrix';
import { RecordsSection, type RecordRow } from './records-section';

interface DirectoryUser {
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

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
  tab?: string;
  page?: string;
  employeeId?: string;
  department?: string;
  role?: string;
  search?: string;
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

const PASSTHROUGH_KEYS: (keyof Filters)[] = [
  'employeeId',
  'department',
  'role',
  'search',
  'date',
  'from',
  'to',
  'month',
  'status',
  'onlyLate',
  'onlyEarlyCheckout',
  'onlyOvertime',
  'onlyCurrentlyWorking',
];

export default async function AdminAttendancePage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { token, user } = await requireSuperAdmin();
  const filters = await searchParams;
  const tab = filters.tab === 'matrix' || filters.tab === 'records' ? filters.tab : 'overview';
  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);

  const query = new URLSearchParams();
  PASSTHROUGH_KEYS.forEach((k) => {
    if (filters[k]) query.set(k, filters[k]!);
  });
  query.set('page', String(page));

  // Separate from `query` (which is also used as-is for the backend fetch below): the Pager
  // needs `tab` preserved in its Next/Previous links, or navigating pages would silently drop
  // back to the default tab.
  const pagerQuery = new URLSearchParams(query);
  pagerQuery.set('tab', tab);

  const [directory, summary] = await Promise.all([
    apiFetch<DirectoryUser[]>('/users/directory', { token }),
    apiFetch<AdminSummary>(`/attendance/admin/summary${filters.date ? `?date=${filters.date}` : ''}`, { token }),
  ]);

  let overview: Page<OverviewRow> | null = null;
  let matrix: (Page<MatrixRow> & { days: string[] }) | null = null;
  let records: Page<RecordRow> | null = null;

  if (tab === 'overview') {
    overview = await apiFetch<Page<OverviewRow>>(`/attendance/admin/overview?${query.toString()}`, { token });
  } else if (tab === 'matrix') {
    matrix = await apiFetch<Page<MatrixRow> & { days: string[] }>(`/attendance/admin/matrix?${query.toString()}`, { token });
  } else {
    records = await apiFetch<Page<RecordRow>>(`/attendance/admin/records?${query.toString()}`, { token });
  }

  const active = overview ?? matrix ?? records!;
  const departments = Array.from(new Set(directory.map((e) => e.department).filter((d): d is string => !!d)));
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== 'tab' && k !== 'page' && Boolean(v));

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

      <AttendanceTabNav tab={tab} />

      <SectionTitle>Filters</SectionTitle>
      <form className="mb-6 rounded-lg border border-border bg-surface p-4">
        <input type="hidden" name="tab" value={tab} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Search" htmlFor="search">
            <Input id="search" name="search" type="text" placeholder="Employee name" defaultValue={filters.search ?? ''} />
          </Field>
          <Field label="Employee" htmlFor="employeeId">
            <Select id="employeeId" name="employeeId" defaultValue={filters.employeeId ?? ''}>
              <option value="">All employees</option>
              {directory.map((e) => (
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
              <option value="manager">Manager</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </Field>

          {tab === 'records' && (
            <>
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
            </>
          )}
          {tab === 'overview' && (
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={filters.date || todayIST()} />
            </Field>
          )}
          {tab === 'matrix' && (
            <Field label="Month" htmlFor="month">
              <Input id="month" name="month" type="month" defaultValue={filters.month || currentMonthIST()} />
            </Field>
          )}
        </div>

        {tab === 'records' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
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
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
          {hasFilters && (
            <LinkButton href={`/admin/attendance?tab=${tab}`} variant="ghost" size="sm">
              Clear
            </LinkButton>
          )}
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </form>

      {tab === 'overview' && overview && <OverviewSection items={overview.items} />}
      {tab === 'matrix' && matrix && <AttendanceMatrix items={matrix.items} days={matrix.days} />}
      {tab === 'records' && records && <RecordsSection items={records.items} />}

      <Pager page={active.page} total={active.total} pageSize={active.pageSize} basePath="/admin/attendance" searchParams={pagerQuery} />
    </AppShell>
  );
}
