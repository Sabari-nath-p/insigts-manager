import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';
import { ReviewButtons } from './review-buttons';

interface LeaveRequest {
  id: string;
  userId: string;
  type: 'paid' | 'medical' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

interface UserSummary {
  id: string;
  fullName: string;
  email: string;
}

function statusBadgeClass(status: string) {
  if (status === 'approved') return shared.badgeGreen;
  if (status === 'rejected') return shared.badgeRed;
  return shared.badgeYellow;
}

export default async function AdminLeavesPage() {
  const { token, user } = await requireSuperAdmin();
  const [leaves, employees] = await Promise.all([
    apiFetch<LeaveRequest[]>('/leaves', { token }),
    apiFetch<UserSummary[]>('/users', { token }),
  ]);

  const nameById = new Map(employees.map((e) => [e.id, e.fullName]));
  const pending = leaves.filter((l) => l.status === 'pending');
  const decided = leaves.filter((l) => l.status !== 'pending');

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Leave requests</h1>
          <p className={shared.pageSubtitle}>{pending.length} awaiting review</p>
        </div>
      </div>

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          Pending
        </p>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((l) => (
                <tr key={l.id}>
                  <td>{nameById.get(l.userId) ?? l.userId}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.startDate} → {l.endDate}
                  </td>
                  <td>{l.days}</td>
                  <td>{l.reason}</td>
                  <td>
                    <ReviewButtons leaveId={l.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.length === 0 && <p className={shared.empty}>Nothing pending review.</p>}
        </div>
      </div>

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          Decided
        </p>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((l) => (
                <tr key={l.id}>
                  <td>{nameById.get(l.userId) ?? l.userId}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.startDate} → {l.endDate}
                  </td>
                  <td>{l.days}</td>
                  <td>
                    <span className={`${shared.badge} ${statusBadgeClass(l.status)}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {decided.length === 0 && <p className={shared.empty}>No decided requests yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
