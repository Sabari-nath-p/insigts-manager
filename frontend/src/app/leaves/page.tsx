import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';
import { ApplyLeaveForm } from './apply-leave-form';

interface LeaveRequest {
  id: string;
  type: 'paid' | 'medical' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  reviewNote: string | null;
}

function statusBadgeClass(status: string) {
  if (status === 'approved') return shared.badgeGreen;
  if (status === 'rejected') return shared.badgeRed;
  return shared.badgeYellow;
}

export default async function LeavesPage() {
  const { token, user } = await requireSession();
  const myLeaves = await apiFetch<LeaveRequest[]>('/leaves/me', { token });

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Leaves</h1>
          <p className={shared.pageSubtitle}>
            Paid and medical requests are sanctioned by an admin; if declined they&rsquo;re
            marked unpaid instead of being flatly rejected.
          </p>
        </div>
      </div>

      <ApplyLeaveForm />

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          My requests
        </p>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.map((l) => (
                <tr key={l.id}>
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
                  <td>{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {myLeaves.length === 0 && <p className={shared.empty}>No leave requests yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
