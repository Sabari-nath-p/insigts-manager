import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import shared from '@/components/shared.module.css';
import { CheckInOutPanel } from './check-in-out-panel';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
}

export default async function AttendancePage() {
  const { token, user } = await requireSession();

  const [today, history] = await Promise.all([
    apiFetch<AttendanceRecord | null>('/attendance/me/today', { token }),
    apiFetch<AttendanceRecord[]>('/attendance/me', { token }),
  ]);

  return (
    <AppShell user={user}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Attendance</h1>
          <p className={shared.pageSubtitle}>
            Check in when you start, check out when you&rsquo;re done.
          </p>
        </div>
      </div>

      <CheckInOutPanel today={today} />

      <div className={shared.card}>
        <p className={shared.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          History
        </p>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Worked</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '—'}</td>
                  <td>{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '—'}</td>
                  <td>{r.workedMinutes != null ? `${Math.round((r.workedMinutes / 60) * 100) / 100} hrs` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className={shared.empty}>No attendance records yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
