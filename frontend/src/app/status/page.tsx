import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';
import { StatusSelector } from './status-selector';

interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  currentStatus: string;
}

function statusBadgeClass(status: string) {
  if (status === 'working') return shared.badgeGreen;
  if (status === 'on_leave') return shared.badgeRed;
  if (status === 'offline') return shared.badgeGray;
  return shared.badgeYellow;
}

export default async function StatusPage() {
  const { token, user } = await requireSession();
  const team = await apiFetch<TeamMember[]>('/users/team/status', { token });
  const me = team.find((m) => m.id === user.userId);

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Team status</h1>
          <p className={shared.pageSubtitle}>See what everyone is up to right now.</p>
        </div>
      </div>

      <StatusSelector current={me?.currentStatus ?? 'offline'} />

      <div className={shared.card}>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>{m.fullName}</td>
                  <td>{m.role.replace('_', ' ')}</td>
                  <td>
                    <span className={`${shared.badge} ${statusBadgeClass(m.currentStatus)}`}>
                      {m.currentStatus.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
