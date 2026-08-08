import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';

interface Overview {
  totalWorkedHours: number;
  expectedHours: number;
  totalWorkHoursNotWorked: number;
  leavesTaken: { paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number };
  leaveBalance: { paidRemaining: number; medicalRemaining: number };
}

async function getMyOverview(token: string): Promise<Overview | null> {
  const res = await fetch(`${getApiBaseUrl()}/users/me/overview`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const { token, user } = await requireSession();
  const overview = await getMyOverview(token);

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Welcome back</h1>
          <p className={shared.pageSubtitle}>{user.email} · {user.role.replace('_', ' ')}</p>
        </div>
        <div className={shared.buttonRow}>
          <Link href="/attendance" className={shared.button}>
            Check in / out
          </Link>
          <Link href="/leaves" className={shared.buttonSecondary}>
            Apply for leave
          </Link>
        </div>
      </div>

      <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
        This month so far
      </p>
      <div className={shared.statGrid}>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Hours worked</div>
          <div className={shared.statValue}>{overview?.totalWorkedHours ?? '—'}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Expected hours</div>
          <div className={shared.statValue}>{overview?.expectedHours ?? '—'}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Hours not worked</div>
          <div className={shared.statValue}>{overview?.totalWorkHoursNotWorked ?? '—'}</div>
        </div>
        <div className={shared.statCard}>
          <div className={shared.statLabel}>Leave days taken</div>
          <div className={shared.statValue}>{overview?.leavesTaken.totalDays ?? '—'}</div>
        </div>
      </div>

      {overview && (
        <div className={shared.card}>
          <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
            Leave balance
          </p>
          <div className={shared.statGrid} style={{ marginBottom: 0 }}>
            <div>
              <div className={shared.statLabel}>Paid remaining</div>
              <div className={shared.statValue}>{overview.leaveBalance.paidRemaining}</div>
            </div>
            <div>
              <div className={shared.statLabel}>Medical remaining</div>
              <div className={shared.statValue}>{overview.leaveBalance.medicalRemaining}</div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
