import Link from 'next/link';
import { LayoutDashboard, Building2 } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { AttendanceTimer, TodayRecord } from '@/components/attendance-timer';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { LinkButton } from '@/components/ui/button';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type { EmployeePayrollRecord } from '../payroll/types';

interface Overview {
  totalWorkedHours: number;
  expectedHours: number;
  totalWorkHoursNotWorked: number;
  leavesTaken: { paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number };
  leaveBalance: { paidRemaining: number; medicalRemaining: number };
}

interface MyClient {
  id: string;
  clientName: string;
  status: string;
  industry: string | null;
}

const CLIENT_STATUS_TONE: Record<string, BadgeKey> = {
  active: 'badgeGreen',
  onboarding: 'badgeBlue',
  paused: 'badgeYellow',
  completed: 'badgeGray',
  archived: 'badgeRed',
};

export default async function DashboardPage() {
  const { token, user } = await requireSession();
  const [overview, today, myClients, payrollRecords] = await Promise.all([
    apiFetch<Overview>('/users/me/overview', { token }).catch(() => null),
    apiFetch<TodayRecord | null>('/attendance/me/today', { token }).catch(() => null),
    apiFetch<MyClient[]>('/clients/mine', { token }).catch(() => []),
    apiFetch<EmployeePayrollRecord[]>('/payroll/me', { token }).catch(() => []),
  ]);
  const latestPayroll = payrollRecords[0];

  return (
    <AppShell user={user}>
      <PageHeader
        title="Welcome back"
        icon={LayoutDashboard}
        tone="purple"
        subtitle={
          <>
            {user.email} · <span className="capitalize">{user.role.replace('_', ' ')}</span>
          </>
        }
        actions={
          <>
            <LinkButton href="/attendance" size="sm">
              Check in / out
            </LinkButton>
            <LinkButton href="/leaves" variant="secondary" size="sm">
              Apply for leave
            </LinkButton>
          </>
        }
      />

      <SectionTitle>Today&rsquo;s attendance</SectionTitle>
      <AttendanceTimer today={today} />

      <SectionTitle>This month so far</SectionTitle>
      <MetricStrip className="mb-2">
        <Metric label="Hours worked" value={overview?.totalWorkedHours ?? '—'} />
        <Metric label="Expected hours" value={overview?.expectedHours ?? '—'} />
        <Metric label="Hours not worked" value={overview?.totalWorkHoursNotWorked ?? '—'} />
        <Metric label="Leave days taken" value={overview?.leavesTaken.totalDays ?? '—'} />
      </MetricStrip>

      {overview && (
        <>
          <SectionTitle>Leave balance</SectionTitle>
          <PropertyList>
            <PropertyRow label="Paid remaining" value={overview.leaveBalance.paidRemaining} />
            <PropertyRow label="Medical remaining" value={overview.leaveBalance.medicalRemaining} />
          </PropertyList>
        </>
      )}

      {latestPayroll && (
        <>
          <SectionTitle
            action={
              <Link href="/payroll" className="text-xs font-medium text-primary hover:text-primary-dark">
                View My Payroll →
              </Link>
            }
          >
            Latest payroll
          </SectionTitle>
          <MetricStrip className="mb-2">
            <Metric label="Payable hours" value={latestPayroll.payableHours} />
            <Metric label="Payroll amount" value={`₹${latestPayroll.payrollAmount.toLocaleString('en-IN')}`} />
            <Metric label="Status" value={<span className="capitalize">{latestPayroll.status.replace('_', ' ')}</span>} />
            <Metric label="Payment" value={<span className="capitalize">{latestPayroll.paymentStatus}</span>} />
          </MetricStrip>
        </>
      )}

      {myClients.length > 0 && (
        <>
          <SectionTitle
            action={
              <Link href="/clients" className="text-xs font-medium text-primary hover:text-primary-dark">
                View all clients →
              </Link>
            }
          >
            My Clients
          </SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myClients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted" />
                  <span className="text-sm font-medium text-text">{c.clientName}</span>
                  {c.industry && <span className="text-xs text-muted">{c.industry}</span>}
                </div>
                <Pill tone={CLIENT_STATUS_TONE[c.status] ?? 'badgeGray'}>{c.status}</Pill>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
