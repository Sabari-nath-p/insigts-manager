import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';

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

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>{detail.fullName}</h1>
          <p className={shared.pageSubtitle}>
            {detail.email} · {detail.phone}
          </p>
        </div>
        <span className={`${shared.badge} ${shared.badgeGray}`}>
          {detail.role.replace('_', ' ')}
        </span>
      </div>

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          Schedule &amp; compensation
        </p>
        <table className={shared.table}>
          <tbody>
            <tr>
              <td>Working type</td>
              <td>{detail.workingType}</td>
            </tr>
            {detail.workingType === 'fixed' ? (
              <>
                <tr>
                  <td>Hours / day</td>
                  <td>{detail.fixedHoursPerDay}</td>
                </tr>
                <tr>
                  <td>Shift</td>
                  <td>
                    {detail.fixedStartTime} – {detail.fixedEndTime}
                  </td>
                </tr>
                <tr>
                  <td>Working days</td>
                  <td>{detail.workingDays?.join(', ')}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td>Target hours / month</td>
                <td>{detail.flexibleMonthlyHours}</td>
              </tr>
            )}
            <tr>
              <td>Current salary</td>
              <td>{detail.currentSalary}</td>
            </tr>
            <tr>
              <td>Paid leave quota</td>
              <td>{detail.paidLeaveQuota} / year</td>
            </tr>
            <tr>
              <td>Medical leave quota</td>
              <td>{detail.medicalLeaveQuota} / year</td>
            </tr>
            <tr>
              <td>Current status</td>
              <td>{detail.currentStatus.replace('_', ' ')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
        Overview ({overview.period.from} to {overview.period.to})
      </p>
      <div className={shared.statGrid}>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Hours worked</div>
          <div className={shared.statValue}>{overview.totalWorkedHours}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Expected hours</div>
          <div className={shared.statValue}>{overview.expectedHours}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Hours not worked</div>
          <div className={shared.statValue}>{overview.totalWorkHoursNotWorked}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Leave days taken</div>
          <div className={shared.statValue}>{overview.leavesTaken.totalDays}</div>
        </div>
      </div>

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          Leave breakdown
        </p>
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Paid</th>
              <th>Medical</th>
              <th>Unpaid</th>
              <th>Paid remaining</th>
              <th>Medical remaining</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{overview.leavesTaken.paidDays}</td>
              <td>{overview.leavesTaken.medicalDays}</td>
              <td>{overview.leavesTaken.unpaidDays}</td>
              <td>{overview.leaveBalance.paidRemaining}</td>
              <td>{overview.leaveBalance.medicalRemaining}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
