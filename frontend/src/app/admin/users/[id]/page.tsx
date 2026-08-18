import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { SectionTitle } from '@/components/ui/page-header';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';

interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  workingType: string;
  fixedHoursPerDay: number | null;
  fixedStartTime: string | null;
  fixedEndTime: string | null;
  workingDays: string[] | null;
  flexibleMonthlyHours: number | null;
  currentSalary: string;
  paidLeaveQuota: number;
  medicalLeaveQuota: number;
  currentStatus: string;
  isActive: boolean;
}

interface Overview {
  period: { from: string; to: string };
  totalWorkedHours: number;
  expectedHours: number;
  totalWorkHoursNotWorked: number;
  leavesTaken: { paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number };
  leaveBalance: { paidRemaining: number; medicalRemaining: number };
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireSuperAdmin();

  let detail: UserDetail;
  let overview: Overview;
  try {
    [detail, overview] = await Promise.all([
      apiFetch<UserDetail>(`/users/${id}`, { token }),
      apiFetch<Overview>(`/users/${id}/overview`, { token }),
    ]);
  } catch {
    notFound();
  }

  const schedule =
    detail.workingType === 'fixed'
      ? `${detail.fixedHoursPerDay}h/day · ${detail.fixedStartTime}–${detail.fixedEndTime} · ${detail.workingDays?.join(', ')}`
      : `${detail.flexibleMonthlyHours}h/month`;

  return (
    <AppShell user={user} title={detail.fullName}>
      <div className="mb-8 flex items-start gap-4">
        <Avatar name={detail.fullName} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-text">{detail.fullName}</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="capitalize">{detail.role.replace('_', ' ')}</span>
            {detail.workingType && <> · <span className="capitalize">{detail.workingType}</span></>}
          </p>
        </div>
        <Pill tone="badgeGray" className="ml-auto">
          {detail.currentStatus.replace('_', ' ')}
        </Pill>
      </div>

      <PropertyList className="mb-2">
        <PropertyRow label="Email" value={detail.email} />
        <PropertyRow label="Phone" value={detail.phone} />
        <PropertyRow label="Working type" value={<span className="capitalize">{detail.workingType}</span>} />
        <PropertyRow label="Schedule" value={schedule} />
        <PropertyRow label="Current salary" value={detail.currentSalary} />
        <PropertyRow label="Leave quota" value={`${detail.paidLeaveQuota} paid / ${detail.medicalLeaveQuota} medical per year`} />
        <PropertyRow
          label="Leave balance"
          value={`${overview.leaveBalance.paidRemaining} paid remaining · ${overview.leaveBalance.medicalRemaining} medical remaining`}
        />
      </PropertyList>

      <SectionTitle>Attendance ({overview.period.from} to {overview.period.to})</SectionTitle>
      <MetricStrip className="mb-2">
        <Metric label="Hours worked" value={overview.totalWorkedHours} />
        <Metric label="Expected hours" value={overview.expectedHours} />
        <Metric label="Hours not worked" value={overview.totalWorkHoursNotWorked} />
        <Metric label="Leave days taken" value={overview.leavesTaken.totalDays} />
      </MetricStrip>

      <SectionTitle>Leave history</SectionTitle>
      <PropertyList className="mb-2">
        <PropertyRow label="Paid days taken" value={overview.leavesTaken.paidDays} />
        <PropertyRow label="Medical days taken" value={overview.leavesTaken.medicalDays} />
        <PropertyRow label="Unpaid days taken" value={overview.leavesTaken.unpaidDays} />
      </PropertyList>

      <SectionTitle>Performance</SectionTitle>
      <p className="text-sm text-muted">Not tracked yet.</p>

      <SectionTitle>Documents</SectionTitle>
      <p className="text-sm text-muted">No documents uploaded yet.</p>

      <SectionTitle>Activity</SectionTitle>
      <p className="text-sm text-muted">Not tracked yet.</p>
    </AppShell>
  );
}
