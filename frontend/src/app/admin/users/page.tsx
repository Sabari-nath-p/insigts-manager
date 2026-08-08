import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';

interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
  workingType: string;
  currentStatus: string;
  isActive: boolean;
}

export default async function AdminUsersPage() {
  const { token, user } = await requireSuperAdmin();
  const employees = await apiFetch<UserSummary[]>('/users', { token });

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Employees</h1>
          <p className={shared.pageSubtitle}>{employees.length} account(s)</p>
        </div>
        <Link href="/admin/users/new" className={shared.button}>
          + New account
        </Link>
      </div>

      <div className={shared.card}>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Working type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.fullName}</td>
                  <td>{e.email}</td>
                  <td>
                    <span className={`${shared.badge} ${shared.badgeGray}`}>
                      {e.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{e.workingType}</td>
                  <td>{e.currentStatus.replace('_', ' ')}</td>
                  <td>
                    <Link href={`/admin/users/${e.id}`} className={shared.buttonSecondary}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <p className={shared.empty}>No accounts yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
